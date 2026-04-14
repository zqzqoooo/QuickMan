import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  zh: {
    translation: {
      dashboard: "综合看板", cabinets: "柜子管理", assets: "设备管理", users: "用户管理",
      logout: "退出登录", add: "新增", edit: "编辑", delete: "删除", detail: "详情",
      inStock: "在库", borrowed: "已借出", normal: "正常使用",
      code: "编号", name: "名称", status: "状态", action: "操作", category: "分类",
      operator: "操作人", time: "操作时间", remarks: "备注", role: "角色", username: "用户名",
      totalAssets: "资产总数", currentInStock: "当前在库", inStockRate: "在库率", overdue: "逾期未归还 (>7天)",
      attention: "⚠️ 重点关注：长时间未归还设备", borrowTime: "借出时间", severeOverdue: "严重逾期",
      assetDetails: "设备详情", basicInfo: "基本信息", belongCabinet: "所属柜子",
      transactionHistory: "流转历史记录", actionType: "操作类型", noImage: "📦 无图片",
      out: "借出", in: "归还",
      latitude: "纬度", longitude: "经度",
      cabinetDetail: "柜子详情", assetDetail: "设备详情",
      cabinetList: "柜内设备列表", locationInfo: "地理位置信息",
      noLocationInfo: "暂无地理位置信息",
      getDataFailed: "获取数据失败", editSuccess: "修改成功！", addSuccess: "新增成功！",
      deleteSuccess: "删除成功！", deleteFailed: "删除失败",
      dangerOperation: "危险操作", confirmDeleteCabinet: "确定要删除这个柜子吗？",
      confirmDelete: "确认删除", cancel: "取消",
      gpsLng: "经度", gpsLat: "纬度",
      search: "搜索设备...", noResults: "没有找到匹配的设备", noData: "暂无设备",
      borrow: "借出", return: "归还", all: "全部",
      borrowSuccess: "借出成功！", returnSuccess: "归还成功！", statusChangeFailed: "状态修改失败",
      confirmDeleteAsset: "确定要删除这个设备吗？",
      returned: "已归还", getAssetFailed: "获取设备失败",
      recentTransactions: "最近10次流转记录", borrower: "借用人"
    }
  },
  en: {
    translation: {
      dashboard: "Dashboard", cabinets: "Cabinets", assets: "Assets", users: "Users",
      logout: "Logout", add: "Add", edit: "Edit", delete: "Delete", detail: "Details",
      inStock: "In Stock", borrowed: "Borrowed", normal: "Normal",
      code: "Code", name: "Name", status: "Status", action: "Action", category: "Category",
      operator: "Operator", time: "Time", remarks: "Remarks", role: "Role", username: "Username",
      totalAssets: "Total Assets", currentInStock: "In Stock", inStockRate: "In Stock Rate", overdue: "Overdue (>7 Days)",
      attention: "⚠️ Attention: Long-term Unreturned Assets", borrowTime: "Borrow Time", severeOverdue: "Severe Overdue",
      assetDetails: "Asset Details", basicInfo: "Basic Info", belongCabinet: "Cabinet",
      transactionHistory: "Transaction History", actionType: "Action Type", noImage: "📦 No Image",
      out: "Borrow", in: "Return",
      latitude: "Latitude", longitude: "Longitude",
      cabinetDetail: "Cabinet Details", assetDetail: "Asset Details",
      cabinetList: "Assets in Cabinet", locationInfo: "Location Info",
      noLocationInfo: "No location info available",
      getDataFailed: "Failed to get data", editSuccess: "Updated successfully！", addSuccess: "Added successfully！",
      deleteSuccess: "Deleted successfully！", deleteFailed: "Delete failed",
      dangerOperation: "Dangerous Operation", confirmDeleteCabinet: "Are you sure you want to delete this cabinet?",
      confirmDelete: "Confirm Delete", cancel: "Cancel",
      gpsLng: "Lng", gpsLat: "Lat",
      search: "Search assets...", noResults: "No matching assets found", noData: "No assets available",
      borrow: "Borrow", return: "Return", all: "All",
      borrowSuccess: "Borrowed successfully！", returnSuccess: "Returned successfully！", statusChangeFailed: "Status change failed",
      confirmDeleteAsset: "Are you sure you want to delete this asset?",
      returned: "Returned", getAssetFailed: "Failed to get assets",
      recentTransactions: "Recent 10 Transactions", borrower: "Borrower"
    }
  }
};

i18n.use(initReactI18next).init({
  resources,
  lng: localStorage.getItem('i18n_lang') || 'zh',
  fallbackLng: 'zh',
  interpolation: { escapeValue: false }
});

i18n.on('languageChanged', (lng) => {
  localStorage.setItem('i18n_lang', lng);
});

export default i18n;
