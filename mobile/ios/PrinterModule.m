#import "PrinterModule.h"
#import "JCAPI.h"

@implementation PrinterModule

RCT_EXPORT_MODULE(PrinterModule);

// 1. 初始化 SDK (必须最先调用)
RCT_EXPORT_METHOD(initSDK:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
    NSError *error = nil;
    [JCAPI initImageProcessing:nil error:&error]; // 不传自定义字体路径
    if (error) {
        reject(@"INIT_ERROR", error.localizedDescription, error);
    } else {
        resolve(@(YES));
    }
}

// 2. 扫描蓝牙打印机
RCT_EXPORT_METHOD(scanPrinters:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
    [JCAPI scanBluetoothPrinter:^(NSArray *scanedPrinterNames) {
        resolve(scanedPrinterNames ? scanedPrinterNames : @[]); // 返回扫描到的设备名称数组 [cite: 426, 428]
    }];
}

// 3. 连接打印机
RCT_EXPORT_METHOD(connectPrinter:(NSString *)printerName resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
    [JCAPI openPrinter:printerName completion:^(BOOL isSuccess) {
        if (isSuccess) {
            resolve(@(YES));
        } else {
            reject(@"CONNECT_FAILED", @"打印机连接失败", nil);
        }
    }];
}

// 4. 准备打印环境 (修改版)
RCT_EXPORT_METHOD(preparePrint:(float)width height:(float)height copies:(int)copies resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
    
    // 关键修复：开启任务前，必须先设置总打印张数
    [JCAPI setTotalQuantityOfPrints:copies];
    
    // 浓度设为 2 (兼容性更好)，纸张类型 1 (间隙纸)
    [JCAPI startJob:2 withPaperStyle:1 withCompletion:^(BOOL isSuccess) {
        if (isSuccess) {
            [JCAPI initDrawingBoard:width withHeight:height withHorizontalShift:0 withVerticalShift:0 rotate:0 fontArray:@[]];
            resolve(@(YES));
        } else {
            reject(@"START_JOB_FAILED", @"开启任务失败(请检查: 1.是否缺纸 2.纸仓盖是否盖紧)", nil);
        }
    }];
}

// 5. 绘制文字
RCT_EXPORT_METHOD(drawText:(float)x y:(float)y width:(float)w height:(float)h text:(NSString *)text fontSize:(float)fontSize resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
    BOOL result = [JCAPI drawLableText:x withY:y withWidth:w withHeight:h withString:text withFontFamily:@"" withFontSize:fontSize withRotate:0 withTextAlignHorizonral:0 withTextAlignVertical:1 withLineMode:1 withLetterSpacing:0 withLineSpacing:1 withFontStyle:@[@0,@0,@0,@0]];
    resolve(@(result));
}

// 6. 绘制二维码
RCT_EXPORT_METHOD(drawQRCode:(float)x y:(float)y width:(float)w text:(NSString *)text resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
    BOOL result = [JCAPI drawLableQrCode:x withY:y withWidth:w withHeight:w withString:text withRotate:0 withCodeType:31]; // 31代表QR CODE [cite: 1103, 1116, 1118, 1120, 1122, 1124]
    resolve(@(result));
}

// 7. 提交并结束
RCT_EXPORT_METHOD(commitPrint:(int)copies resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
    NSString *jsonStr = [JCAPI GenerateLableJson]; // 必须先生成 JSON [cite: 1243]
    [JCAPI commit:jsonStr withOnePageNumbers:copies withComplete:^(BOOL isSuccess) {
        if (isSuccess) {
            [JCAPI endPrint:^(BOOL endSuccess) {
                 resolve(@(endSuccess));
            }];
        } else {
            reject(@"COMMIT_FAILED", @"提交打印数据失败", nil);
        }
    }];
}

@end
