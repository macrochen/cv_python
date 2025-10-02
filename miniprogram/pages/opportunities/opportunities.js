// pages/opportunities/opportunities.js
const app = getApp();

Page({
  data: {
    opportunities: [],
    isModalVisible: false,
    statusOptions: ['已投递', '面试中', '已发Offer', '已结束'],
    // For the modal
    formData: { // Use a specific object for form data
      company_name: '',
      position_name: '',
      status: '已投递',
      latest_progress: '',
      job_description: ''
    },
    editingOpportunityId: null, // To distinguish between Add and Edit
    selectedStatusIndex: 0
  },

  onShow: function () {
    this.fetchOpportunities();
  },

  fetchOpportunities: function () {
    const userOpenId = app.globalData.userInfo ? app.globalData.userInfo.openid : null;
    if (!userOpenId) {
      wx.showToast({ title: '用户未登录', icon: 'error', duration: 2000 });
      return;
    }
    const backendBaseUrl = app.globalData.backendBaseUrl;
    wx.request({
      url: `${backendBaseUrl}/opportunities/${userOpenId}`,
      method: 'GET',
      success: (res) => {
        if (res.statusCode === 200) {
          const opportunities = res.data.map(opp => {
            const statusIconMap = { '已投递': '✈️', '面试中': '🗓️', '已发Offer': '✅', '已结束': '❌' };
            const formattedCreateDate = opp.created_at.substring(0, 10);
            if (opp.latest_progress) {
              const icon = statusIconMap[opp.status] || '📢';
              opp.displayProgress = `${icon} \u00A0 ${opp.latest_progress}`;
            } else {
              opp.displayProgress = `🕒 \u00A0 ${formattedCreateDate}`;
            }
            opp.updated_at_formatted = opp.updated_at.substring(0, 10);
            opp.created_at_formatted = formattedCreateDate;
            return opp;
          });
          this.setData({ opportunities: opportunities });
        } else {
          wx.showToast({ title: '获取列表失败', icon: 'error', duration: 2000 });
        }
      },
      fail: () => { wx.showToast({ title: '网络错误', icon: 'error', duration: 2000 }); },
    });
  },

  // --- Modal Logic --- //
  handleAddButtonTap: function() {
    // This function acts as a clean entry point for Add mode, ensuring no event object is passed.
    this.showOpportunityModal();
  },

  showOpportunityModal: function(opportunity = null) {
    if (opportunity) {
      // Edit mode
      const statusIndex = this.data.statusOptions.indexOf(opportunity.status);
      this.setData({
        isModalVisible: true,
        editingOpportunityId: opportunity.id,
        formData: {
          company_name: opportunity.company_name,
          position_name: opportunity.position_name,
          status: opportunity.status,
          latest_progress: opportunity.latest_progress,
          job_description: opportunity.job_description
        },
        selectedStatusIndex: statusIndex >= 0 ? statusIndex : 0
      });
      console.log("Data to set for Edit mode:", opportunity);
    } else {
      // Add mode
      const dataToSet = {
        isModalVisible: true,
        editingOpportunityId: null,
        formData: { company_name: '', position_name: '', status: '已投递', latest_progress: '', job_description: '' },
        selectedStatusIndex: 0
      };
      console.log("Data to set for Add mode:", dataToSet);
      this.setData(dataToSet);
    }
  },

  hideModal: function() {
    this.setData({ isModalVisible: false });
  },

  handleInputChange: function(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({
      [`formData.${field}`]: e.detail.value
    });
  },

  bindStatusChange: function(e) {
    this.setData({
      selectedStatusIndex: e.detail.value,
      'formData.status': this.data.statusOptions[e.detail.value]
    });
  },

  handleSaveOpportunity: function() {
    const userOpenId = app.globalData.userInfo ? app.globalData.userInfo.openid : null;
    if (!this.data.formData.company_name || !this.data.formData.position_name) {
      wx.showToast({ title: '公司和职位为必填项', icon: 'none' });
      return;
    }
    if (!userOpenId) {
      wx.showToast({ title: '用户未登录', icon: 'error' });
      return;
    }

    const backendBaseUrl = app.globalData.backendBaseUrl;
    const isEditing = this.data.editingOpportunityId !== null;
    const url = isEditing ? `${backendBaseUrl}/opportunity/${this.data.editingOpportunityId}` : `${backendBaseUrl}/opportunities`;
    const method = isEditing ? 'PUT' : 'POST';

    const dataToSend = {
      ...this.data.formData,
      user_openid: userOpenId
    };

    wx.request({
      url: url,
      method: method,
      data: dataToSend,
      success: (res) => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          wx.showToast({ title: isEditing ? '修改成功' : '添加成功', icon: 'success' });
          this.hideModal();
          this.fetchOpportunities();
        } else {
          wx.showToast({ title: '保存失败', icon: 'error' });
        }
      },
      fail: () => { wx.showToast({ title: '网络错误', icon: 'error' }); }
    });
  },

  // --- Action Sheet and Delete Logic --- //
  showMoreActions: function(e) {
    const opportunityId = e.currentTarget.dataset.id;
    wx.showActionSheet({
      itemList: ['编辑', '删除'],
      success: (res) => {
        if (res.tapIndex === 1) { // Delete
          this.deleteOpportunity(opportunityId);
        } else if (res.tapIndex === 0) { // Edit
          this.editOpportunity(opportunityId);
        }
      }
    });
  },

  editOpportunity: function(id) {
    const backendBaseUrl = app.globalData.backendBaseUrl;
    wx.request({
      url: `${backendBaseUrl}/opportunity/${id}`,
      method: 'GET',
      success: (res) => {
        if (res.statusCode === 200) {
          this.showOpportunityModal(res.data);
        } else {
          wx.showToast({ title: '获取详情失败', icon: 'error' });
        }
      },
      fail: () => { wx.showToast({ title: '网络错误', icon: 'error' }); }
    });
  },

  deleteOpportunity: function(id) {
    wx.showModal({
      title: '确认删除',
      content: '您确定要删除这个机会吗？此操作无法撤销。',
      success: (res) => {
        if (res.confirm) {
          const backendBaseUrl = app.globalData.backendBaseUrl;
          wx.request({
            url: `${backendBaseUrl}/opportunity/${id}`,
            method: 'DELETE',
            success: (deleteRes) => {
              if (deleteRes.statusCode === 200) {
                wx.showToast({ title: '删除成功', icon: 'success' });
                this.fetchOpportunities();
              } else {
                wx.showToast({ title: '删除失败', icon: 'error' });
              }
            },
            fail: () => { wx.showToast({ title: '网络错误', icon: 'error' }); }
          });
        }
      }
    });
  },

  doNothing: function() {},

  onPullDownRefresh: function () {
    this.fetchOpportunities();
  }
});
