// pages/opportunities/opportunities.js
const app = getApp();

Page({
  data: {
    opportunities: [],
    isModalVisible: false,
    statusOptions: ['已投递', '面试中', '已发Offer', '已结束'],
    selectedStatusIndex: 0
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
      // Optionally, navigate to a login page
      // wx.navigateTo({ url: '/pages/login/login' });
      return;
    }

    const backendBaseUrl = app.globalData.backendBaseUrl;
    wx.request({
      url: `${backendBaseUrl}/opportunities/${userOpenId}`,
      method: 'GET',
      success: (res) => {
        if (res.statusCode === 200) {
          const statusIconMap = {
            '已投递': '✈️',
            '面试中': '🗓️',
            '已发Offer': '✅',
            '已结束': '❌'
          };

          const opportunities = res.data.map(opp => {
            const formattedCreateDate = opp.created_at.substring(0, 10);
            if (opp.latest_progress) {
              const icon = statusIconMap[opp.status] || '📢'; // Default icon
              opp.displayProgress = `${icon} \u00A0 ${opp.latest_progress}`;
            } else {
              opp.displayProgress = `🕒 \u00A0 ${formattedCreateDate}`;
            }
            // Keep original dates if needed elsewhere, just format for display
            opp.updated_at_formatted = opp.updated_at.substring(0, 10);
            opp.created_at_formatted = formattedCreateDate;
            return opp;
          });

          this.setData({
            opportunities: opportunities
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
      },
      complete: () => {
        wx.stopPullDownRefresh(); // Stop the refresh animation
      }
    });
  },

  showAddModal: function() {
    this.setData({ isModalVisible: true, selectedStatusIndex: 0 });
  },

  hideModal: function() {
    this.setData({ isModalVisible: false });
  },

  bindStatusChange: function(e) {
    console.log("Picker value changed, new index:", e.detail.value);
    this.setData({
      selectedStatusIndex: e.detail.value
    })
  },

  handleSaveOpportunity: function(e) {
    const formData = e.detail.value;
    const userOpenId = app.globalData.userInfo ? app.globalData.userInfo.openid : null;

    if (!formData.company_name || !formData.position_name) {
      wx.showToast({
        title: '公司和职位为必填项',
        icon: 'none'
      });
      return;
    }

    if (!userOpenId) {
      wx.showToast({ title: '用户未登录', icon: 'error' });
      return;
    }

    const backendBaseUrl = app.globalData.backendBaseUrl;
    wx.request({
      url: `${backendBaseUrl}/opportunities`,
      method: 'POST',
      data: {
        user_openid: userOpenId,
        company_name: formData.company_name,
        position_name: formData.position_name,
        status: this.data.statusOptions[this.data.selectedStatusIndex],
        latest_progress: formData.latest_progress,
        job_description: formData.job_description
      },
      success: (res) => {
        if (res.statusCode === 201) {
          wx.showToast({ title: '添加成功', icon: 'success' });
          this.hideModal();
          this.fetchOpportunities(); // Refresh the list
        } else {
          wx.showToast({ title: '添加失败', icon: 'error' });
          console.error("Failed to save opportunity: ", res);
        }
      },
      fail: (err) => {
        wx.showToast({ title: '网络错误', icon: 'error' });
        console.error("Error saving opportunity: ", err);
      }
    });
  },

  doNothing: function() {
    // This is used on a catchtap to prevent the modal from closing when clicking on the panel itself
  },

  onPullDownRefresh: function () {
    // Handle pull-down refresh
    this.fetchOpportunities();
  },

  showMoreActions: function(e) {
    const opportunityId = e.currentTarget.dataset.id;
    const that = this;

    wx.showActionSheet({
      itemList: ['编辑', '删除'],
      success: function(res) {
        if (res.tapIndex === 1) { // Index 1 is '删除'
          that.deleteOpportunity(opportunityId);
        } else if (res.tapIndex === 0) { // Index 0 is '编辑'
          // To be implemented in the next step
          console.log("Edit action for opportunity: ", opportunityId);
          wx.showToast({ title: '编辑功能待开发', icon: 'none' });
        }
      },
      fail: function(res) {
        console.log(res.errMsg);
      }
    });
  },

  deleteOpportunity: function(id) {
    const that = this;
    wx.showModal({
      title: '确认删除',
      content: '您确定要删除这个机会吗？此操作无法撤销。',
      success: function(res) {
        if (res.confirm) {
          const backendBaseUrl = app.globalData.backendBaseUrl;
          wx.request({
            url: `${backendBaseUrl}/opportunity/${id}`,
            method: 'DELETE',
            success: function(deleteRes) {
              if (deleteRes.statusCode === 200) {
                wx.showToast({ title: '删除成功', icon: 'success' });
                that.fetchOpportunities(); // Refresh the list
              } else {
                wx.showToast({ title: '删除失败', icon: 'error' });
                console.error("Failed to delete opportunity: ", deleteRes);
              }
            },
            fail: function(err) {
              wx.showToast({ title: '网络错误', icon: 'error' });
              console.error("Error deleting opportunity: ", err);
            }
          });
        }
      }
    });
  }
});
