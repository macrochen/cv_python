// pages/opportunity-detail/opportunity-detail.js
const app = getApp();
const Towxml = require('../../towxml/main');

Page({
  data: {
    opportunityId: null,
    opportunity: null,
    jdMarkdown: {}, // For towxml component
    activeTab: 'details', // To control the active tab
    isAnalyzingJd: false,
    jdAnalysisResult: null
  },

  onLoad: function (options) {
    if (options.id) {
      this.setData({ opportunityId: options.id });
      this.fetchOpportunityDetail();
    }
  },

  fetchOpportunityDetail: function () {
    const id = this.data.opportunityId;
    if (!id) return;

    const backendBaseUrl = app.globalData.backendBaseUrl;
    wx.request({
      url: `${backendBaseUrl}/opportunity/${id}`,
      method: 'GET',
      success: (res) => {
        if (res.statusCode === 200) {
          const towxml = new Towxml();
          const jdContent = res.data.job_description || '暂无职位描述';
          const jdMarkdown = towxml.toJson(jdContent);
          
          this.setData({ 
            opportunity: res.data,
            jdMarkdown: jdMarkdown
          });
        } else {
          wx.showToast({
            title: '获取详情失败',
            icon: 'error'
          });
        }
      },
      fail: () => {
        wx.showToast({ title: '网络错误', icon: 'error' });
      }
    });
  },

  switchTab: function(e) {
    const tab = e.currentTarget.dataset.tab;
    if (tab !== this.data.activeTab) {
      this.setData({ activeTab: tab });
    }
  },

  handleAnalyzeJd: function() {
    this.setData({ isAnalyzingJd: true, jdAnalysisResult: null });

    const id = this.data.opportunityId;
    const backendBaseUrl = app.globalData.backendBaseUrl;

    wx.request({
      url: `${backendBaseUrl}/opportunity/${id}/analyze_jd`,
      method: 'POST',
      success: (res) => {
        if (res.statusCode === 200) {
          this.setData({
            isAnalyzingJd: false,
            jdAnalysisResult: res.data
          });
        } else {
          this.setData({ isAnalyzingJd: false });
          wx.showToast({ title: '分析失败', icon: 'error' });
        }
      },
      fail: () => {
        this.setData({ isAnalyzingJd: false });
        wx.showToast({ title: '网络错误', icon: 'error' });
      }
    });
  }
});
