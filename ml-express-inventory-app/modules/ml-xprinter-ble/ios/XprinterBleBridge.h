#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

typedef void (^XprinterBleDevicesBlock)(NSArray<NSDictionary *> *devices);
typedef void (^XprinterBleVoidBlock)(void);
typedef void (^XprinterBleErrorBlock)(NSString *message);

@interface XprinterBleBridge : NSObject

+ (instancetype)shared;

@property (nonatomic, copy, nullable) XprinterBleDevicesBlock onDevicesFound;
@property (nonatomic, copy, nullable) XprinterBleVoidBlock onConnected;
@property (nonatomic, copy, nullable) XprinterBleErrorBlock onConnectFailed;
@property (nonatomic, copy, nullable) XprinterBleVoidBlock onDisconnected;

- (void)startScan;
- (void)stopScan;
- (void)connectDeviceId:(NSString *)deviceId
             completion:(void (^)(BOOL success, NSString * _Nullable error))completion;
- (void)disconnect;
- (BOOL)isConnected;
- (void)sendTsplPayload:(NSString *)payload
             completion:(void (^)(BOOL success, NSString * _Nullable error))completion;

@end

NS_ASSUME_NONNULL_END
