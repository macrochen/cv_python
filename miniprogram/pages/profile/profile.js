// miniprogram/pages/profile/profile.js
const app = getApp();
const Towxml = require('../../towxml/main'); // Import towxml

Page({
  data: {
    userInfo: {
      avatar_url: '',
      name: '',
      profile_content: ''
    },
    isEditing: false,
    editedContent: '', // Holds the content being edited
    showToast: false,
    toastMessage: '',
    renderedMarkdown: {} // Data for towxml component
  },

  onLoad() {
    this.fetchUserProfile();
  },

  fetchUserProfile() {
    const backendBaseUrl = app.globalData.backendBaseUrl;

    const userOpenId = app.globalData.userInfo ? app.globalData.userInfo.openid : null;

    if (!userOpenId) {
      console.error("User OpenID not found in globalData.");
      wx.showToast({
        title: '用户未登录',
        icon: 'error'
      });
      return;
    }

    wx.request({
      url: `${backendBaseUrl}/users/${userOpenId}`, // Corrected endpoint
      method: 'GET',
      success: (res) => {
        if (res.statusCode === 200 && res.data) {
          this.setData({
            userInfo: res.data,
            editedContent: res.data.profile_content, // Initialize editedContent
            renderedMarkdown: Towxml().toJson(res.data.profile_content) // Parse Markdown
          });
        } else {
          wx.showToast({
            title: '获取个人信息失败',
            icon: 'error'
          });
          console.error("Failed to fetch user profile:", res);
        }
      },
      fail: (err) => {
        wx.showToast({
          title: '网络错误，获取失败',
          icon: 'error'
        });
        console.error("Failed to fetch user profile:", err);
      }
    });
  },

  editProfile() {
    this.setData({
      isEditing: true,
      editedContent: this.data.userInfo.profile_content // Load current content into editor
    });
  },

  onEditorInput(e) {
    this.setData({
      editedContent: e.detail.value
    });
  },

  saveProfile() {
    const backendBaseUrl = app.globalData.backendBaseUrl;
    const userOpenId = app.globalData.userInfo ? app.globalData.userInfo.openid : null;

    if (!userOpenId) {
      wx.showToast({
        title: '用户未登录',
        icon: 'error'
      });
      return;
    }

    wx.request({
      url: `${backendBaseUrl}/users/${userOpenId}`,
      method: 'PUT',
      data: {
        profile_content: this.data.editedContent
      },
      success: (res) => {
        if (res.statusCode === 200) {
          this.setData({
            'userInfo.profile_content': this.data.editedContent,
            isEditing: false,
            renderedMarkdown: Towxml().toJson(this.data.editedContent)
          });
          this.showToast('保存成功 ✔');
        } else {
          wx.showToast({
            title: '保存失败',
            icon: 'error'
          });
          console.error("Failed to save user profile: ", res);
        }
      },
      fail: (err) => {
        wx.showToast({
          title: '网络错误，保存失败',
          icon: 'error'
        });
        console.error("Failed to save user profile:", err);
      }
    });
  },

  cancelEdit() {
    this.setData({
      isEditing: false,
      editedContent: this.data.userInfo.profile_content // Revert to original content
    });
  },

  showToast(message) {
    this.setData({
      showToast: true,
      toastMessage: message
    });
    setTimeout(() => {
      this.setData({
        showToast: false,
        toastMessage: ''
      });
    }, 2000);
  }
});