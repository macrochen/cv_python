// pages/opportunities/opportunities.js
const app = getApp();

Page({
  data: {
    opportunities: []
  },

  onShow: function () {
    // Using onShow to ensure data is refreshed every time the page is displayed
    this.fetchOpportunities();
  },

  fetchOpportunities: function () {
    const userOpenId = app.globalData.userInfo ? app.globalData.userInfo.openid : null;

    if (!userOpenId) {
      wx.showToast({
        title: '用户未登录',
        icon: 'error',
        duration: 2000
      });
      return;
    }

    const backendBaseUrl = app.globalData.backendBaseUrl;
    wx.request({
      url: `${backendBaseUrl}/opportunities/${userOpenId}`,
      method: 'GET',
      success: (res) => {
        if (res.statusCode === 200) {
          this.setData({
            opportunities: res.data
          });
        } else {
          wx.showToast({
            title: '获取列表失败',
            icon: 'error',
            duration: 2000
          });
          console.error("Failed to fetch opportunities: ", res);
        }
      },
      fail: (err) => {
        wx.showToast({
          title: '网络错误',
          icon: 'error',
          duration: 2000
        });
        console.error("Error fetching opportunities: ", err);
      }
    });
  },

  onPullDownRefresh: function () {
    // Handle pull-down refresh
    this.fetchOpportunities();
    wx.stopPullDownRefresh();
  }
});