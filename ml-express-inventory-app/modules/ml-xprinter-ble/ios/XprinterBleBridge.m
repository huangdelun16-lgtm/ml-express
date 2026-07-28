#import "XprinterBleBridge.h"
#import "MBLEManager.h"
#import <CoreBluetooth/CoreBluetooth.h>

@interface XprinterBleBridge () <MBLEManagerDelegate>
@property (nonatomic, strong) NSMutableDictionary<NSString *, CBPeripheral *> *peripheralMap;
@property (nonatomic, strong, nullable) CBPeripheral *connectedPeripheral;
@property (nonatomic, copy, nullable) void (^pendingConnectCompletion)(BOOL, NSString * _Nullable);
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

- (void)startScan {
  [self.peripheralMap removeAllObjects];
  [[MBLEManager sharedInstance] MstartScan];
}

- (void)stopScan {
  [[MBLEManager sharedInstance] MstopScan];
}

- (void)connectDeviceId:(NSString *)deviceId
             completion:(void (^)(BOOL, NSString * _Nullable))completion {
  CBPeripheral *peripheral = self.peripheralMap[deviceId];
  if (!peripheral) {
    if (completion) completion(NO, @"IOS_BLE_PRINTER_NOT_FOUND");
    return;
  }
  self.pendingConnectCompletion = completion;
  if (self.connectedPeripheral && [self.connectedPeripheral.identifier.UUIDString isEqualToString:deviceId]) {
    if (completion) completion(YES, nil);
    self.pendingConnectCompletion = nil;
    return;
  }
  [[MBLEManager sharedInstance] MconnectDevice:peripheral];
}

- (void)disconnect {
  self.connectedPeripheral = nil;
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
