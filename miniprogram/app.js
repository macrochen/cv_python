App({
  onLaunch() {
    // 展示本地存储能力
    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)

    // 模拟登录
    this.mockLogin();
  },

  mockLogin() {
    const mockUser = {
      openid: 'test_user_001'
    };

    this.globalData.userInfo = mockUser;
    console.log('Mock login successful, only openid sent:', this.globalData.userInfo);

    // Only send openid to backend for initial user creation/check
    wx.request({
      url: `${this.globalData.backendBaseUrl}/users`,
      method: 'POST',
      data: {
        openid: mockUser.openid
      },
      success: (res) => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          console.log('Mock user openid sent to backend successfully:', res.data);
          // Update globalData.userInfo with any additional info returned by backend (e.g., id)
          // The full user info (name, avatar, profile_content) will be fetched by profile.js
          this.globalData.userInfo = { ...this.globalData.userInfo, ...res.data };
        } else {
          console.error('Failed to send mock user openid to backend:', res);
        }
      },
      fail: (err) => {
        console.error('Network error when sending mock user openid to backend:', err);
      }
    });
  },

  globalData: {
    userInfo: null,
    backendBaseUrl: 'http://127.0.0.1:5000' // Our Flask backend URL
  }
})