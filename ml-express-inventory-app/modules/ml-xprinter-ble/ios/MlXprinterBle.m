#import "MlXprinterBle.h"
#import "XprinterBleBridge.h"

@implementation MlXprinterBle {
  BOOL _hasListeners;
}

RCT_EXPORT_MODULE(MlXprinterBle);

+ (BOOL)requiresMainQueueSetup {
  return YES;
}

- (NSArray<NSString *> *)supportedEvents {
  return @[ @"onDeviceFound", @"onConnectionChanged" ];
}

- (void)startObserving {
  _hasListeners = YES;
}

- (void)stopObserving {
  _hasListeners = NO;
}

- (void)emitDevices:(NSArray<NSDictionary *> *)devices {
  if (!_hasListeners || devices.count == 0) return;
  [self sendEventWithName:@"onDeviceFound" body:@{ @"devices": devices }];
}

RCT_EXPORT_METHOD(startScan) {
  XprinterBleBridge *bridge = [XprinterBleBridge shared];
  __weak MlXprinterBle *weakSelf = self;
  bridge.onDevicesFound = ^(NSArray<NSDictionary *> *devices) {
    [weakSelf emitDevices:devices];
  };
  [bridge startScan];
}

RCT_EXPORT_METHOD(stopScan) {
  [[XprinterBleBridge shared] stopScan];
}

RCT_EXPORT_METHOD(connect:(NSString *)deviceId
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  [[XprinterBleBridge shared] connectDeviceId:deviceId
                                   completion:^(BOOL success, NSString *_Nullable error) {
    if (success) {
      [self sendEventWithName:@"onConnectionChanged" body:@{ @"connected": @YES }];
      resolve(@YES);
      return;
    }
    [self sendEventWithName:@"onConnectionChanged"
                       body:@{ @"connected": @NO, @"error": error ?: @"IOS_BLE_CONNECT_FAILED" }];
    reject(@"IOS_BLE_CONNECT_FAILED", error ?: @"Connect failed", nil);
  }];
}

RCT_EXPORT_METHOD(disconnect) {
  [[XprinterBleBridge shared] disconnect];
  [self sendEventWithName:@"onConnectionChanged" body:@{ @"connected": @NO }];
}

RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(isConnected) {
  return @([[XprinterBleBridge shared] isConnected]);
}

RCT_EXPORT_METHOD(sendTspl:(NSString *)payload
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  [[XprinterBleBridge shared] sendTsplPayload:payload
                                   completion:^(BOOL success, NSString *_Nullable error) {
    if (success) {
      resolve(nil);
      return;
    }
    reject(@"IOS_BLE_PRINT_FAILED", error ?: @"Print failed", nil);
  }];
}

@end
