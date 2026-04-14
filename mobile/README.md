# QuickManDebug - GEARSTACK 调试控制台

## 项目概述

QuickManDebug（GEARSTACK DEBUG CONSOLE）是一个基于 **React Native + Expo** 开发的设备管理调试工具应用。该应用集成了二维码扫描、相机拍照、音频反馈、本地数据存储、NFC 读写等功能，旨在为设备管理和调试提供一个便捷的移动端工具。

**项目名称**: QuickManDebug  
**应用名称**: GEARSTACK DEBUG CONSOLE  
**版本**: 1.0.0  
**开发框架**: React Native + Expo SDK 54  
**目标平台**: iOS / Android  

---

## 功能模块

### 1. 硬件输入 & 反馈 (Scanner / Haptics)
- **二维码扫描**: 使用设备相机扫描 QR 码，获取设备标识信息
- **音频反馈**: 操作成功时播放提示音
- **振动反馈**: 操作时触发设备振动，提供触觉反馈

### 2. 图像采集 (Camera / ImagePicker)
- **相机拍照**: 调用系统相机拍摄设备照片
- **图片预览**: 拍照后实时显示图片预览
- **图片附件**: 照片可作为设备记录的附件存储

### 3. 存储原子操作 (CRUD / AsyncStorage)
- **新增 (Create)**: 添加新的设备记录到本地数据库
- **读取 (Read)**: 从本地存储读取所有设备数据
- **更新 (Update)**: 修改设备状态和其他字段
- **删除 (Delete)**: 移除设备记录

### 4. NFC 模块 (Read/Write)
- **NFC 读取**: 读取 NFC 标签中的文本数据（仅支持 Android）
- **NFC 写入**: 写入数据到 NFC 标签（功能预留）

### 5. 标签打印 (Niimbot SDK)
- **打印机连接**: 连接标签打印机（功能预留）
- **标签打印**: 打印设备标签（功能预留）

---

## 技术栈

### 核心框架
- **React**: 19.1.0
- **React Native**: 0.81.5
- **Expo SDK**: ~54.0.33

### 主要依赖库

| 依赖库 | 版本 | 用途 |
|--------|------|------|
| expo-camera | ~17.0.10 | 相机功能（二维码扫描） |
| expo-image-picker | ~17.0.10 | 图像选择和拍照 |
| expo-audio | ~1.1.1 | 音频播放 |
| @react-native-async-storage/async-storage | 2.2.0 | 本地数据持久化 |
| react-native-nfc-manager | ^3.17.2 | NFC 读写功能 |
| react-native-qrcode-svg | ^6.3.21 | 二维码生成 |
| react-native-svg | 15.12.1 | SVG 图形渲染 |

---

## 项目结构

```
QuickManDebug/
├── App.js                    # 主应用入口
├── app.json                  # Expo 应用配置
├── package.json              # 项目依赖配置
├── index.js                  # 应用入口点
├── assets/                   # 静态资源文件
│   ├── icon.png
│   ├── splash-icon.png
│   ├── adaptive-icon.png
│   └── favicon.png
└── src/                      # 源代码目录
    ├── components/           # UI 组件
    │   ├── QRScanner.js      # 二维码扫描组件
    │   ├── QRGenerator.js    # 二维码生成组件
    │   └── AssetItem.js      # 设备项组件
    └── services/             # 业务服务层
        ├── StorageService.js # 本地存储服务
        ├── FeedbackService.js# 音频与振动反馈服务
        ├── ImageService.js   # 图像采集服务
        ├── NfcService.js     # NFC 读写服务
        └── ScannerService.js # 扫描服务
```

---

## 核心服务 API 文档

### StorageService - 本地存储服务

基于 AsyncStorage 实现的数据持久化服务，存储键名为 `@gs_debug_db`。

| 方法名 | 参数 | 返回值 | 说明 |
|--------|------|--------|------|
| `create(item)` | `item: Object` | `Promise<Array>` | 新增数据记录 |
| `read()` | - | `Promise<Array>` | 读取全部数据 |
| `update(id, updates)` | `id: String, updates: Object` | `Promise<Array>` | 更新指定数据 |
| `remove(id)` | `id: String` | `Promise<Array>` | 删除指定数据 |
| `clear()` | - | `Promise<void>` | 清空全部数据 |

**使用示例**:
```javascript
// 新增数据
const newData = await StorageService.create({
  id: 'DEVICE-001',
  status: 'New',
  time: new Date().toLocaleTimeString()
});

// 读取数据
const allData = await StorageService.read();

// 更新数据
const updatedData = await StorageService.update('DEVICE-001', { 
  status: 'Updated' 
});

// 删除数据
const remainingData = await StorageService.remove('DEVICE-001');
```

---

### FeedbackService - 反馈服务

提供音频播放和振动反馈功能。

| 方法名 | 参数 | 返回值 | 说明 |
|--------|------|--------|------|
| `loadSounds()` | - | `Promise<boolean>` | 预加载音频文件 |
| `playBeep()` | - | `void` | 播放提示音 + 振动 |
| `playError()` | - | `void` | 播放错误振动模式 |

**使用示例**:
```javascript
// 应用启动时预加载音频
await FeedbackService.loadSounds();

// 操作成功时播放提示
FeedbackService.playBeep();

// 操作失败时播放错误反馈
FeedbackService.playError();
```

---

### ImageService - 图像服务

调用系统相机进行拍照。

| 方法名 | 参数 | 返回值 | 说明 |
|--------|------|--------|------|
| `takePhoto()` | - | `Promise<Object>` | 拍照并返回结果 |

**返回对象结构**:
```javascript
{
  success: boolean,    // 是否成功
  uri: string,        // 成功时返回图片 URI
  error: string       // 失败时返回错误信息
}
```

**使用示例**:
```javascript
const result = await ImageService.takePhoto();

if (result.success) {
  console.log('图片 URI:', result.uri);
  // 显示图片预览
  setImageUri(result.uri);
} else {
  console.log('拍照失败:', result.error);
}
```

---

### NfcService - NFC 服务

提供 NFC 标签读写功能（仅支持 Android 平台）。

| 方法名 | 参数 | 返回值 | 说明 |
|--------|------|--------|------|
| `isSupportedPlatform()` | - | `boolean` | 检查当前平台是否支持 |
| `init()` | - | `Promise<boolean>` | 初始化 NFC |
| `readTag()` | - | `Promise<string\|null>` | 读取 NFC 标签 |

**使用示例**:
```javascript
// 检查平台支持
if (!NfcService.isSupportedPlatform()) {
  console.log('iOS 暂不支持 NFC');
  return;
}

// 初始化 NFC
await NfcService.init();

// 读取 NFC 标签
const data = await NfcService.readTag();
if (data) {
  console.log('NFC 数据:', data);
} else {
  console.log('未读取到数据');
}
```

---

## 快速开始

### 环境要求
- Node.js >= 16
- npm 或 yarn
- Expo CLI
- iOS 模拟器 / Android 模拟器（或真机）

### 安装依赖

```bash
cd QuickManDebug
npm install
```

### 启动开发服务器

```bash
# 启动 Expo 开发服务器
npm start

# 或使用以下命令直接运行特定平台
npm run ios      # 运行 iOS 版本
npm run android  # 运行 Android 版本
npm run web      # 运行 Web 版本
```

### 运行应用

1. **使用 Expo Go 应用（推荐用于开发测试）**:
   - 在手机上安装 Expo Go 应用
   - 扫描终端显示的二维码
   - 应用将自动加载到手机上

2. **使用模拟器**:
   - 按 `i` 在 iOS 模拟器中打开
   - 按 `a` 在 Android 模拟器中打开

3. **构建独立应用**:
   ```bash
   # 构建 iOS 应用
   expo build:ios
   
   # 构建 Android 应用
   expo build:android
   ```

---

## 权限配置

### iOS 权限 (app.json)
```json
{
  "ios": {
    "infoPlist": {
      "NSCameraUsageDescription": "我们需要使用相机扫描器材二维码"
    }
  }
}
```

### Android 权限 (app.json)
```json
{
  "android": {
    "permissions": [
      "android.permission.NFC"
    ]
  }
}
```

---

## UI 设计

### 设计风格
- **主题**: 暗色终端风格
- **主色调**: 绿色 (`#00E676`, `#00FF00`, `#008F11`)
- **背景色**: 黑色 (`#000`, `#111`, `#050505`)
- **字体**: Courier（等宽字体，终端风格）

### 界面布局
1. **顶部标题栏**: 显示应用名称
2. **主内容区**: 5 个功能卡片模块
3. **底部日志区**: 实时显示调试日志

---

## 开发计划

### 已完成功能 ✓
- [x] 二维码扫描
- [x] 音频与振动反馈
- [x] 相机拍照
- [x] 本地数据存储（CRUD）
- [x] NFC 读取（Android）

### 待开发功能
- [ ] 二维码生成功能
- [ ] NFC 写入功能
- [ ] 标签打印功能
- [ ] 数据同步到云端
- [ ] 多语言支持
- [ ] 设备搜索与筛选
- [ ] 批量操作功能

---

## 调试说明

### 查看日志
应用底部有实时日志显示区域，最多显示 15 条最新日志，格式为：
```
[时间] 操作描述
```

### 常见问题

**Q: NFC 功能无法使用？**  
A: NFC 功能仅支持 Android 设备，且需要在系统设置中开启 NFC。

**Q: 相机无法启动？**  
A: 确保应用已获得相机权限。iOS 需在 Info.plist 中配置 `NSCameraUsageDescription`。

**Q: 音频没有声音？**  
A: 确保设备未静音，且应用启动时 `FeedbackService.loadSounds()` 已成功执行。

---

## 许可证

本项目为私人项目 (private: true)，仅供学习和内部使用。

---

## 联系方式

**开发者**: [您的姓名]  
**课程**: Dynamic Web Technologies  
**学校**: University of the West of Scotland  
**日期**: 2026

---

*本文档最后更新于 2026-03-03*
