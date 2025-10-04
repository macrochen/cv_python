// pages/dashboard/dashboard.js
Page({
  data: {
    combinedAbilityData: [],
    actionSuggestions: [],
    loadingAbilityData: true,
    errorAbilityData: false,
    loadingActionSuggestions: true, // 新增：行动建议加载状态
    errorActionSuggestions: false, // 新增：行动建议错误状态
    // 将 action type 映射到后端使用的 opportunity status
    actionTypeToStatusMap: {
      'interviewing': '面试中',
      'pending': '待投递',
      'submitted': '已投递' // Changed from 'written_test' to 'submitted'
    }
  },

  onLoad: function (options) {
    this.fetchAbilityData();
    this.fetchActionSuggestions(); // 调用API获取行动建议
    console.log('onLoad end - errorAbilityData:', this.data.errorAbilityData);
  },

  onReady: function () {

  },

  onShow: function () {
    console.log('onShow start - errorAbilityData:', this.data.errorAbilityData);
    console.log('onShow start - combinedAbilityData:', this.data.combinedAbilityData);
    console.log('onShow end - errorAbilityData:', this.data.errorAbilityData);
  },

  onHide: function () {

  },

  onUnload: function () {

  },

  onPullDownRefresh: function () {
    this.fetchAbilityData();
    this.fetchActionSuggestions(); // 下拉刷新时重新获取行动建议
  },
  onReachBottom: function () {

  },
  onShareAppMessage: function () {

  },

  // 辅助函数：将对象 {key: value} 转换为数组 [{key: key, value: value}]
  _convertObjectToArray: function(obj) {
    if (!obj || typeof obj !== 'object') {
      return [];
    }
    return Object.keys(obj).map(key => ({
      key: key,
      value: obj[key]
    }));
  },

  // 从后端API获取能力数据
  fetchAbilityData: function () {
    const app = getApp();
    const backendBaseUrl = app.globalData.backendBaseUrl;
    const userOpenId = app.globalData.userInfo ? app.globalData.userInfo.openid : null;

    console.log('Fetching ability data...');
    console.log('backendBaseUrl:', backendBaseUrl);
    console.log('userOpenId:', userOpenId);

    if (!backendBaseUrl) {
      console.error('backendBaseUrl is not configured in app.js globalData.');
      this.setData({
        errorAbilityData: true,
        loadingAbilityData: false,
        combinedAbilityData: []
      });
      console.log('fetchAbilityData end (no backendBaseUrl) - errorAbilityData:', this.data.errorAbilityData);
      return;
    }

    if (!userOpenId) {
      console.error('User OpenID not found in globalData.userInfo.');
      this.setData({
        errorAbilityData: true,
        loadingAbilityData: false,
        combinedAbilityData: []
      });
      console.log('fetchAbilityData end (no userOpenId) - errorAbilityData:', this.data.errorAbilityData);
      return;
    }

    this.setData({
      loadingAbilityData: true,
      errorAbilityData: false,
      combinedAbilityData: []
    });

    wx.request({
      url: `${backendBaseUrl}/assessments/latest/${userOpenId}`,
      method: 'GET',
      success: (res) => {
        console.log('API Response Status Code:', res.statusCode);
        console.log('API Response Data:', res.data);

        if (res.statusCode === 200 && res.data) {
          console.log('API call successful, processing data.');
          const { latest_assessment, previous_assessment } = res.data;

          console.log('Raw latest_assessment.radar_chart_data:', latest_assessment ? latest_assessment.radar_chart_data : 'N/A');
          console.log('Raw previous_assessment.radar_chart_data:', previous_assessment ? previous_assessment.radar_chart_data : 'N/A');

          // 使用辅助函数转换数据
          let fetchedLatestData = (latest_assessment && latest_assessment.radar_chart_data) ? this._convertObjectToArray(latest_assessment.radar_chart_data) : [];
          let fetchedPreviousData = (previous_assessment && previous_assessment.radar_chart_data) ? this._convertObjectToArray(previous_assessment.radar_chart_data) : [];

          console.log('Processed fetchedLatestData:', fetchedLatestData);
          console.log('Processed fetchedPreviousData:', fetchedPreviousData);

          const combined = fetchedLatestData.map((item, index) => ({
            key: item.key,
            latest_value: item.value,
            previous_value: fetchedPreviousData[index] ? fetchedPreviousData[index].value : 0
          }));

          console.log('Before setData - loadingAbilityData:', this.data.loadingAbilityData, 'errorAbilityData:', this.data.errorAbilityData);
          this.setData({
            combinedAbilityData: combined,
            loadingAbilityData: false,
            errorAbilityData: false // 明确设置为 false
          });
          console.log('After setData - loadingAbilityData:', this.data.loadingAbilityData, 'errorAbilityData:', this.data.errorAbilityData);
          console.log('Combined Ability Data Length:', combined.length);
        } else {
          console.log('API call returned non-200 status or empty data, setting error state.');
          console.error('Failed to fetch ability data (non-200 or empty data):', res);
          this.setData({
            errorAbilityData: true,
            loadingAbilityData: false,
            combinedAbilityData: []
          });
        }
        console.log('fetchAbilityData end (success callback) - errorAbilityData:', this.data.errorAbilityData);
      },
      fail: (err) => {
        console.log('Request for ability data failed (network error), setting error state.');
        console.error('Request for ability data failed (network error):', err);
        this.setData({
          errorAbilityData: true,
          loadingAbilityData: false,
          combinedAbilityData: []
        });
        console.log('fetchAbilityData end (fail callback) - errorAbilityData:', this.data.errorAbilityData);
      }
    });
  },

  // 从后端API获取行动建议数据
  fetchActionSuggestions: function () {
    const app = getApp();
    const backendBaseUrl = app.globalData.backendBaseUrl;
    const userOpenId = app.globalData.userInfo ? app.globalData.userInfo.openid : null;

    console.log('Fetching action suggestions...');
    console.log('backendBaseUrl (suggestions):', backendBaseUrl);
    console.log('userOpenId (suggestions):', userOpenId);

    if (!backendBaseUrl) {
      console.error('backendBaseUrl is not configured for action suggestions.');
      this.setData({
        errorActionSuggestions: true,
        loadingActionSuggestions: false,
        actionSuggestions: []
      });
      return;
    }

    if (!userOpenId) {
      console.error('User OpenID not found for action suggestions.');
      this.setData({
        errorActionSuggestions: true,
        loadingActionSuggestions: false,
        actionSuggestions: []
      });
      return;
    }

    this.setData({
      loadingActionSuggestions: true,
      errorActionSuggestions: false,
      actionSuggestions: []
    });

    wx.request({
      url: `${backendBaseUrl}/action_suggestions/${userOpenId}`,
      method: 'GET',
      success: (res) => {
        console.log('Action Suggestions API Response Status Code:', res.statusCode);
        console.log('Action Suggestions API Response Data:', res.data);

        if (res.statusCode === 200 && Array.isArray(res.data)) {
          console.log('Action Suggestions API call successful, processing data.');
          this.setData({
            actionSuggestions: res.data,
            loadingActionSuggestions: false,
            errorActionSuggestions: false
          });
        } else {
          console.error('Failed to fetch action suggestions (non-200 or non-array data):', res);
          this.setData({
            errorActionSuggestions: true,
            loadingActionSuggestions: false,
            actionSuggestions: []
          });
        }
        console.log('fetchActionSuggestions end (success callback) - errorActionSuggestions:', this.data.errorActionSuggestions);
      },
      fail: (err) => {
        console.error('Request for action suggestions failed (network error):', err);
        this.setData({
          errorActionSuggestions: true,
          loadingActionSuggestions: false,
          actionSuggestions: []
        });
        console.log('fetchActionSuggestions end (fail callback) - errorActionSuggestions:', this.data.errorActionSuggestions);
      }
    });
  },

  handleActionTap: function (e) {
    const { action } = e.currentTarget.dataset;
    // 获取点击的建议项的完整数据
    const suggestion = this.data.actionSuggestions.find(s => s.action === action);

    if (!suggestion) {
      wx.showToast({
        title: `未找到对应建议`, 
        icon: 'none'
      });
      return;
    }

    console.log('actionTypeToStatusMap:', this.data.actionTypeToStatusMap);
    console.log('Suggestion Type:', suggestion.type);
    const targetStatus = this.data.actionTypeToStatusMap[suggestion.type]; // Access from this.data
    console.log('Target Status:', targetStatus);

    if (targetStatus) {
      const app = getApp();                                                         
      app.globalData.opportunitiesFilterStatus = targetStatus; // 将过滤状态存入全局数据                                                                
      const url = `/pages/opportunities/opportunities`; // 移除查询字符串
      console.log('Navigating to URL:', url);
      wx.switchTab({
        url: url
      });
    } else {
      wx.showToast({
        title: `未知建议类型: ${suggestion.type}`, 
        icon: 'none'
      });
      console.log('Unknown suggestion type:', suggestion.type);
    }
  }
})