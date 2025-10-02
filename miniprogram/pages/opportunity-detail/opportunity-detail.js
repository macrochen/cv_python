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
    jdAnalysisResult: null,
    isKeywordModalVisible: false,
    resumeKeywords: '',
    isGeneratingResume: false,
    generatedResumeMd: null,
    resumeMarkdown: {}
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
  },

  // --- Keyword Modal and Resume Generation --- //
  showKeywordModal: function() {
    this.setData({ isKeywordModalVisible: true, resumeKeywords: '' });
  },

  hideKeywordModal: function() {
    this.setData({ isKeywordModalVisible: false });
  },

  handleKeywordInput: function(e) {
    this.setData({ resumeKeywords: e.detail.value });
  },

  generateResumeWithKeywords: function() {
    this.hideKeywordModal();
    this.setData({ isGeneratingResume: true });

    const id = this.data.opportunityId;
    const backendBaseUrl = app.globalData.backendBaseUrl;

    wx.request({
      url: `${backendBaseUrl}/opportunity/${id}/generate_resume`,
      method: 'POST',
      data: {
        keywords: this.data.resumeKeywords
      },
      success: (res) => {
        if (res.statusCode === 200 && res.data.resume_md) {
          const towxml = new Towxml();
          const resumeMarkdown = towxml.toJson(res.data.resume_md);
          this.setData({
            generatedResumeMd: res.data.resume_md,
            resumeMarkdown: resumeMarkdown,
            activeTab: 'resume' // Switch to resume tab
          });
        } else {
          wx.showToast({ title: '生成失败', icon: 'error' });
        }
      },
      fail: () => {
        wx.showToast({ title: '网络错误', icon: 'error' });
      },
      complete: () => {
        this.setData({ isGeneratingResume: false });
      }
    });
  }
});
