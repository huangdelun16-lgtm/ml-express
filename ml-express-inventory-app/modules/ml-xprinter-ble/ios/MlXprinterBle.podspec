require 'json'

Pod::Spec.new do |s|
  s.name           = 'MlXprinterBle'
  s.version        = '1.0.0'
  s.summary        = 'Xprinter BLE TSPL printing for iOS'
  s.license        = { :type => 'MIT' }
  s.author         = 'ML Express'
  s.homepage       = 'https://github.com/ml-express/inventory-app'
  s.platform       = :ios, '13.4'
  s.source         = { :git => 'https://github.com/ml-express/inventory-app.git', :tag => "#{s.version}" }
  s.static_framework = true

  s.dependency 'React-Core'

  s.source_files = '*.{h,m}'
  s.public_header_files = 'MlXprinterBle.h', 'XprinterBleBridge.h'
  s.private_header_files = 'PrinterSDK/**/*.h'
  s.vendored_libraries = 'PrinterSDK/libPrinterSDK.a'
  s.frameworks = 'CoreBluetooth', 'UIKit', 'Foundation'
  s.pod_target_xcconfig = {
    'HEADER_SEARCH_PATHS' => '$(PODS_TARGET_SRCROOT)/PrinterSDK $(PODS_TARGET_SRCROOT)',
    'CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES' => 'YES',
    'OTHER_LDFLAGS' => '$(inherited) -ObjC',
  }
end
