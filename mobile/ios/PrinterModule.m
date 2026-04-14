#import "PrinterModule.h"
#import "JCAPI.h"

@implementation PrinterModule

RCT_EXPORT_MODULE(PrinterModule);

// 1. Initialize SDK (must be called first)
RCT_EXPORT_METHOD(initSDK:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
    NSError *error = nil;
    [JCAPI initImageProcessing:nil error:&error];
    if (error) {
        reject(@"INIT_ERROR", error.localizedDescription, error);
    } else {
        resolve(@(YES));
    }
}

// 2. Scan Bluetooth printers
RCT_EXPORT_METHOD(scanPrinters:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
    [JCAPI scanBluetoothPrinter:^(NSArray *scanedPrinterNames) {
        resolve(scanedPrinterNames ? scanedPrinterNames : @[]);
    }];
}

// 3. Connect printer
RCT_EXPORT_METHOD(connectPrinter:(NSString *)printerName resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
    [JCAPI openPrinter:printerName completion:^(BOOL isSuccess) {
        if (isSuccess) {
            resolve(@(YES));
        } else {
            reject(@"CONNECT_FAILED", @"Printer connection failed", nil);
        }
    }];
}

// 4. Prepare print environment (modified version)
RCT_EXPORT_METHOD(preparePrint:(float)width height:(float)height copies:(int)copies resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
    
    // Critical fix: Total number of prints must be set before starting the job
    [JCAPI setTotalQuantityOfPrints:copies];
    
    // Density set to 2 (better compatibility), paper type 1 (gap paper)
    [JCAPI startJob:2 withPaperStyle:1 withCompletion:^(BOOL isSuccess) {
        if (isSuccess) {
            [JCAPI initDrawingBoard:width withHeight:height withHorizontalShift:0 withVerticalShift:0 rotate:0 fontArray:@[]];
            resolve(@(YES));
        } else {
            reject(@"START_JOB_FAILED", @"Failed to start job (Please check: 1. Out of paper 2. Paper bin cover is tight)", nil);
        }
    }];
}

// 5. Draw text
RCT_EXPORT_METHOD(drawText:(float)x y:(float)y width:(float)w height:(float)h text:(NSString *)text fontSize:(float)fontSize resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
    BOOL result = [JCAPI drawLableText:x withY:y withWidth:w withHeight:h withString:text withFontFamily:@"" withFontSize:fontSize withRotate:0 withTextAlignHorizonral:0 withTextAlignVertical:1 withLineMode:1 withLetterSpacing:0 withLineSpacing:1 withFontStyle:@[@0,@0,@0,@0]];
    resolve(@(result));
}

// 6. Draw QR code
RCT_EXPORT_METHOD(drawQRCode:(float)x y:(float)y width:(float)w text:(NSString *)text resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
    BOOL result = [JCAPI drawLableQrCode:x withY:y withWidth:w withHeight:w withString:text withRotate:0 withCodeType:31]; // 31 represents QR CODE [cite: 1103, 1116, 1118, 1120, 1122, 1124]
    resolve(@(result));
}

// 7. Commit and finish
RCT_EXPORT_METHOD(commitPrint:(int)copies resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
    NSString *jsonStr = [JCAPI GenerateLableJson];
    [JCAPI commit:jsonStr withOnePageNumbers:copies withComplete:^(BOOL isSuccess) {
        if (isSuccess) {
            [JCAPI endPrint:^(BOOL endSuccess) {
                 resolve(@(endSuccess));
            }];
        } else {
            reject(@"COMMIT_FAILED", @"Failed to commit print data", nil);
        }
    }];
}

@end
