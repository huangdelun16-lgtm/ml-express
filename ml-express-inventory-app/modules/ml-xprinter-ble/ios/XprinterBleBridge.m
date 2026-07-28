#import "XprinterBleBridge.h"
#import "MBLEManager.h"
#import <CoreBluetooth/CoreBluetooth.h>

static const NSTimeInterval kConnectScanTimeoutSeconds = 12.0;

@interface XprinterBleBridge () <MBLEManagerDelegate>
@property (nonatomic, strong) NSMutableDictionary<NSString *, CBPeripheral *> *peripheralMap;
@property (nonatomic, strong, nullable) CBPeripheral *connectedPeripheral;
@property (nonatomic, copy, nullable) void (^pendingConnectCompletion)(BOOL, NSString * _Nullable);
@property (nonatomic, copy, nullable) NSString *pendingConnectDeviceId;
@property (nonatomic, assign) BOOL reconnectScanInProgress;
@end

@implementation XprinterBleBridge

+ (instancetype)shared {
  static XprinterBleBridge *instance;
  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{
    instance = [[XprinterBleBridge alloc] init];
  });
  return instance;
}

- (instancetype)init {
  self = [super init];
  if (self) {
    _peripheralMap = [NSMutableDictionary dictionary];
    MBLEManager *manager = [MBLEManager sharedInstance];
    manager.delegate = self;
  }
  return self;
}

- (BOOL)isLikelyPrinterName:(NSString *)name {
  if (name.length == 0) return YES;
  NSString *upper = [name uppercaseString];
  NSArray<NSString *> *needles = @[@"PRINTER", @"XP-", @"XP_", @"XPRINTER", @"P201", @"P203", @"芯烨", @"LABEL"];
  for (NSString *needle in needles) {
    if ([upper containsString:needle]) return YES;
  }
  return NO;
}

- (NSArray<NSDictionary *> *)devicePayloadFromPeripherals:(NSArray *)peripherals rssiList:(NSArray *)rssiList {
  NSMutableArray<NSDictionary *> *devices = [NSMutableArray array];
  for (NSUInteger i = 0; i < peripherals.count; i += 1) {
    CBPeripheral *peripheral = peripherals[i];
    if (![peripheral isKindOfClass:[CBPeripheral class]]) continue;
    NSString *name = peripheral.name ?: @"";
    if (![self isLikelyPrinterName:name]) continue;
    NSString *deviceId = peripheral.identifier.UUIDString;
    if (deviceId.length == 0) continue;
    self.peripheralMap[deviceId] = peripheral;
    NSNumber *rssi = i < rssiList.count ? rssiList[i] : @(0);
    NSString *displayName = name.length > 0 ? name : [NSString stringWithFormat:@"Printer (%@)", [deviceId substringToIndex:MIN(8, deviceId.length)]];
    [devices addObject:@{
      @"id": deviceId,
      @"name": displayName,
      @"rssi": rssi ?: @(0),
    }];
  }
  return devices;
}

- (CBCentralManager *)centralManager {
  return [MBLEManager sharedInstance].manager.manager;
}

- (nullable CBPeripheral *)retrievePeripheralForDeviceId:(NSString *)deviceId {
  NSUUID *uuid = [[NSUUID alloc] initWithUUIDString:deviceId];
  CBCentralManager *central = [self centralManager];
  if (!uuid || !central) return nil;
  NSArray<CBPeripheral *> *retrieved = [central retrievePeripheralsWithIdentifiers:@[uuid]];
  CBPeripheral *peripheral = retrieved.firstObject;
  if (peripheral) {
    self.peripheralMap[deviceId] = peripheral;
  }
  return peripheral;
}

- (void)startScan {
  [self.peripheralMap removeAllObjects];
  self.pendingConnectDeviceId = nil;
  self.reconnectScanInProgress = NO;
  [[MBLEManager sharedInstance] MstartScan];
}

- (void)stopScan {
  [[MBLEManager sharedInstance] MstopScan];
  self.reconnectScanInProgress = NO;
}

- (void)finishConnectWithPeripheral:(CBPeripheral *)peripheral
                           deviceId:(NSString *)deviceId
                         completion:(void (^)(BOOL, NSString * _Nullable))completion {
  self.pendingConnectDeviceId = nil;
  self.reconnectScanInProgress = NO;
  self.pendingConnectCompletion = completion;
  if (self.connectedPeripheral &&
      [self.connectedPeripheral.identifier.UUIDString isEqualToString:deviceId]) {
    if (completion) completion(YES, nil);
    self.pendingConnectCompletion = nil;
    return;
  }
  [[MBLEManager sharedInstance] MconnectDevice:peripheral];

  __weak typeof(self) weakSelf = self;
  NSString *targetId = [deviceId copy];
  dispatch_after(
      dispatch_time(DISPATCH_TIME_NOW, (int64_t)(kConnectScanTimeoutSeconds * NSEC_PER_SEC)),
      dispatch_get_main_queue(), ^{
        __strong typeof(weakSelf) self = weakSelf;
        if (!self || !self.pendingConnectCompletion) return;
        if (self.connectedPeripheral &&
            [self.connectedPeripheral.identifier.UUIDString isEqualToString:targetId]) {
          return;
        }
        void (^done)(BOOL, NSString * _Nullable) = self.pendingConnectCompletion;
        self.pendingConnectCompletion = nil;
        if (done) done(NO, @"IOS_BLE_CONNECT_FAILED");
      });
}

- (void)beginReconnectScanForDeviceId:(NSString *)deviceId
                           completion:(void (^)(BOOL, NSString * _Nullable))completion {
  self.pendingConnectDeviceId = deviceId;
  self.pendingConnectCompletion = completion;
  self.reconnectScanInProgress = YES;
  // 不清空 map：保留 retrieve 到的对象；仅启动短扫寻找目标 UUID
  [[MBLEManager sharedInstance] MstartScan];

  __weak typeof(self) weakSelf = self;
  NSString *targetId = [deviceId copy];
  dispatch_after(
      dispatch_time(DISPATCH_TIME_NOW, (int64_t)(kConnectScanTimeoutSeconds * NSEC_PER_SEC)),
      dispatch_get_main_queue(), ^{
        __strong typeof(weakSelf) self = weakSelf;
        if (!self) return;
        if (![self.pendingConnectDeviceId isEqualToString:targetId]) return;
        [[MBLEManager sharedInstance] MstopScan];
        self.reconnectScanInProgress = NO;
        self.pendingConnectDeviceId = nil;
        void (^done)(BOOL, NSString * _Nullable) = self.pendingConnectCompletion;
        self.pendingConnectCompletion = nil;
        if (done) done(NO, @"IOS_BLE_PRINTER_NOT_FOUND");
      });
}

- (void)connectDeviceId:(NSString *)deviceId
             completion:(void (^)(BOOL, NSString * _Nullable))completion {
  if (deviceId.length == 0) {
    if (completion) completion(NO, @"IOS_BLE_PRINTER_NOT_SELECTED");
    return;
  }

  if (self.connectedPeripheral &&
      [self.connectedPeripheral.identifier.UUIDString isEqualToString:deviceId]) {
    if (completion) completion(YES, nil);
    return;
  }

  CBPeripheral *peripheral = self.peripheralMap[deviceId];
  if (!peripheral) {
    peripheral = [self retrievePeripheralForDeviceId:deviceId];
  }

  if (peripheral) {
    [self finishConnectWithPeripheral:peripheral deviceId:deviceId completion:completion];
    return;
  }

  [self beginReconnectScanForDeviceId:deviceId completion:completion];
}

- (void)disconnect {
  self.connectedPeripheral = nil;
  self.pendingConnectDeviceId = nil;
  self.reconnectScanInProgress = NO;
  [[MBLEManager sharedInstance] MdisconnectRootPeripheral];
}

- (BOOL)isConnected {
  return self.connectedPeripheral != nil;
}

- (void)sendTsplPayload:(NSString *)payload
             completion:(void (^)(BOOL, NSString * _Nullable))completion {
  if (!self.isConnected) {
    if (completion) completion(NO, @"IOS_BLE_NOT_CONNECTED");
    return;
  }
  if (payload.length == 0) {
    if (completion) completion(NO, @"IOS_BLE_EMPTY_PAYLOAD");
    return;
  }
  NSData *data = [payload dataUsingEncoding:NSUTF8StringEncoding];
  if (!data) {
    if (completion) completion(NO, @"IOS_BLE_ENCODE_FAILED");
    return;
  }
  [[MBLEManager sharedInstance] MWriteCommandWithData:data];
  if (completion) completion(YES, nil);
}

#pragma mark - MBLEManagerDelegate

- (void)MdidUpdatePeripheralList:(NSArray *)peripherals RSSIList:(NSArray *)rssiList {
  NSArray<NSDictionary *> *devices = [self devicePayloadFromPeripherals:peripherals rssiList:rssiList];
  if (devices.count > 0 && self.onDevicesFound) {
    self.onDevicesFound(devices);
  }

  if (self.pendingConnectDeviceId.length == 0) return;
  CBPeripheral *target = self.peripheralMap[self.pendingConnectDeviceId];
  if (!target) return;

  NSString *deviceId = self.pendingConnectDeviceId;
  void (^completion)(BOOL, NSString * _Nullable) = self.pendingConnectCompletion;
  self.pendingConnectDeviceId = nil;
  self.reconnectScanInProgress = NO;
  [[MBLEManager sharedInstance] MstopScan];
  [self finishConnectWithPeripheral:target deviceId:deviceId completion:completion];
}

- (void)MdidConnectPeripheral:(CBPeripheral *)peripheral {
  self.connectedPeripheral = peripheral;
  if (peripheral.identifier.UUIDString.length > 0) {
    self.peripheralMap[peripheral.identifier.UUIDString] = peripheral;
  }
  if (self.pendingConnectCompletion) {
    self.pendingConnectCompletion(YES, nil);
    self.pendingConnectCompletion = nil;
  }
  if (self.onConnected) self.onConnected();
}

- (void)MdidFailToConnectPeripheral:(CBPeripheral *)peripheral error:(NSError *)error {
  if (self.pendingConnectCompletion) {
    self.pendingConnectCompletion(NO, error.localizedDescription ?: @"IOS_BLE_CONNECT_FAILED");
    self.pendingConnectCompletion = nil;
  }
  self.pendingConnectDeviceId = nil;
  self.reconnectScanInProgress = NO;
  if (self.onConnectFailed) {
    self.onConnectFailed(error.localizedDescription ?: @"IOS_BLE_CONNECT_FAILED");
  }
}

- (void)MdidDisconnectPeripheral:(CBPeripheral *)peripheral isAutoDisconnect:(BOOL)isAutoDisconnect {
  if (self.connectedPeripheral == peripheral) {
    self.connectedPeripheral = nil;
  }
  if (self.onDisconnected) self.onDisconnected();
}

- (void)MdidWriteValueForCharacteristic:(CBCharacteristic *)character error:(NSError *)error {
  if (error && self.onConnectFailed) {
    self.onConnectFailed(error.localizedDescription ?: @"IOS_BLE_WRITE_FAILED");
  }
}

@end
