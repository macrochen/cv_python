// pages/dashboard/dashboard.js
Page({
  data: {
    combinedAbilityData: [],
    actionSuggestions: [],
    loadingAbilityData: true,
    errorAbilityData: false,
    // 模拟行动建议数据 (此部分不受影响)
    mockActionSuggestions: [
      { type: 'interviewing', text: '您有一个面试中的机会，建议进行面试演练。', action: 'practiceInterview', icon: '🎙️' },
      { type: 'pending', text: '您有一个待投递的机会，建议生成定制简历。', action: 'generateResume', icon: '📝' },
      { type: 'written_test', text: '您有一个笔试中的机会，建议预测面试问题。', action: 'predictQuestions', icon: '🧠' }
    ]
  },

  onLoad: function (options) {
    this.fetchAbilityData();
    this.setData({
      actionSuggestions: this.data.mockActionSuggestions
    });
    console.log('onLoad end - errorAbilityData:', this.data.errorAbilityData);
  },

  onReady: function () {

  },

  onShow: function () {
    console.log('onShow start - errorAbilityData:', this.data.errorAbilityData);
    console.log('onShow start - combinedAbilityData:', this.data.combinedAbilityData);
    // Optionally re-fetch data if needed, but for now just log
    // this.fetchAbilityData(); 
    console.log('onShow end - errorAbilityData:', this.data.errorAbilityData);
  },

  onHide: function () {

  },

  onUnload: function () {

  },

  onPullDownRefresh: function () {
    this.fetchAbilityData();
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

  handleActionTap: function (e) {
    const { action } = e.currentTarget.dataset;
    wx.showToast({
      title: `执行动作: ${action}`,
      icon: 'none'
    });
  }
})