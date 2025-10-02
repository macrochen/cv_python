// pages/opportunity-detail/opportunity-detail.js
const app = getApp();
const Towxml = require('../../towxml/main');

// A simple debounce function
let debounceTimer = null;
function debounce(func, delay) {
  return function(...args) {
    const context = this;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => func.apply(context, args), delay);
  };
}

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
    resumeMarkdown: {},
    isEditingResume: false,
    editingResumeMd: '',
    isGeneratingQa: false,
    qaGenerated: false,
    generatedQA: []
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
          
          const generatedResumeMd = res.data.generated_resume_md || null;
          let resumeMarkdown = {};
          if (generatedResumeMd) {
            resumeMarkdown = towxml.toJson(generatedResumeMd);
          }

          this.setData({ 
            opportunity: res.data,
            jdMarkdown: jdMarkdown,
            generatedResumeMd: generatedResumeMd,
            resumeMarkdown: resumeMarkdown
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

    // Check if resume already exists
    if (this.data.generatedResumeMd) {
      wx.showModal({
        title: '重新生成简历',
        content: '该机会已存在简历，是否重新生成？重新生成将覆盖原有内容。',
        success: (res) => {
          if (res.confirm) {
            this._callGenerateResumeApi();
          } else {
            wx.showToast({ title: '已取消生成', icon: 'none' });
            this.setData({ isGeneratingResume: false }); // Ensure loading state is reset if it was set
          }
        }
      });
    } else {
      this._callGenerateResumeApi();
    }
  },

  _callGenerateResumeApi: function() {
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
            activeTab: 'resume',
            'opportunity.generated_resume_md': res.data.resume_md // Update the opportunity object
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
  },

  // --- AI Interview Practice --- //
  handleGeneratePractice: function() {
    this.setData({ isGeneratingQa: true, qaGenerated: false });

    const id = this.data.opportunityId;
    const backendBaseUrl = app.globalData.backendBaseUrl;

    wx.request({
      url: `${backendBaseUrl}/opportunity/${id}/generate_qa`,
      method: 'POST',
      success: (res) => {
        if (res.statusCode === 200 && res.data.qa_list) {
          this.setData({
            qaGenerated: true,
            generatedQA: res.data.qa_list,
            activeTab: 'qa' // Switch to Q&A tab
          });
        } else {
          wx.showToast({ title: '生成问题失败', icon: 'error' });
        }
      },
      fail: () => {
        wx.showToast({ title: '网络错误', icon: 'error' });
      },
      complete: () => {
        this.setData({ isGeneratingQa: false });
      }
    });
  },

  startPractice: function() {
    console.log("Starting practice with generated QA:", this.data.generatedQA);
    wx.showToast({ title: '面试演练功能待开发', icon: 'none' });
    // Full practice overlay implementation will go here
  },

  // --- Q&A List Management --- //
  handleAddQa: function() {
    const newQa = { id: Date.now(), question: '新问题...', suggested_answer: '新答案...' };
    this.setData({
      generatedQA: [...this.data.generatedQA, newQa]
    });
  },

  handleQaInputChange: function(e) {
    const { id, field } = e.currentTarget.dataset;
    const value = e.detail.value;
    const index = this.data.generatedQA.findIndex(qa => qa.id == id);

    if (index !== -1) {
      // Debounce the setData call
      this._debouncedSetQaData(index, field, value);
    }
  },

  // Debounced version of setting QA data
  _debouncedSetQaData: debounce(function(index, field, value) {
    const updatedQA = [...this.data.generatedQA];
    updatedQA[index][field] = value;
    this.setData({ generatedQA: updatedQA });
  }, 300), // 300ms debounce delay

  saveQaList: function() {
    wx.showToast({ title: '问答列表已保存！', icon: 'success' });
    // In a real app, this would send data to backend
  },

  deleteQa: function(e) {
    const idToDelete = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认删除',
      content: '您确定要删除这个问题吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({
            generatedQA: this.data.generatedQA.filter(qa => qa.id != idToDelete)
          });
          wx.showToast({ title: '删除成功', icon: 'success' });
        }
      }
    });
  },

  // --- Resume Editing --- //
  editResume: function() {
    this.setData({
      isEditingResume: true,
      editingResumeMd: this.data.generatedResumeMd
    });
  },

  cancelEditResume: function() {
    this.setData({ isEditingResume: false });
  },

  handleResumeEditorInput: function(e) {
    this.setData({
      editingResumeMd: e.detail.value
    });
  },

  saveResume: function() {
    const newContent = this.data.editingResumeMd;
    const id = this.data.opportunityId;
    const backendBaseUrl = app.globalData.backendBaseUrl;

    wx.request({
      url: `${backendBaseUrl}/opportunity/${id}/update_resume_content`,
      method: 'PUT',
      data: {
        resume_md: newContent
      },
      success: (res) => {
        if (res.statusCode === 200) {
          const towxml = new Towxml();
          const resumeMarkdown = towxml.toJson(newContent);
          this.setData({
            generatedResumeMd: newContent,
            resumeMarkdown: resumeMarkdown,
            isEditingResume: false,
            'opportunity.generated_resume_md': newContent // Update the opportunity object
          });
          wx.showToast({ title: '简历已保存', icon: 'success' });
        } else {
          wx.showToast({ title: '保存失败', icon: 'error' });
        }
      },
      fail: () => {
        wx.showToast({ title: '网络错误', icon: 'error' });
      }
    });
  },

  downloadPdf: function() {
    const resumeMd = this.data.generatedResumeMd;
    if (!resumeMd) {
      wx.showToast({ title: '请先生成简历', icon: 'none' });
      return;
    }

    wx.showLoading({
      title: '正在生成PDF...',
      mask: true
    });

    const backendBaseUrl = app.globalData.backendBaseUrl;
    wx.request({
      url: `${backendBaseUrl}/generate_pdf`,
      method: 'POST',
      data: {
        resume_md: resumeMd
      },
      success: (res) => {
        if (res.statusCode === 200 && res.data.pdf_url) {
          const fullPdfUrl = backendBaseUrl + res.data.pdf_url;
          wx.downloadFile({
            url: fullPdfUrl,
            success: (downloadRes) => {
              if (downloadRes.statusCode === 200) {
                wx.openDocument({
                  filePath: downloadRes.tempFilePath,
                  showMenu: true,
                  success: () => {
                    wx.hideLoading();
                  },
                  fail: (openErr) => {
                    wx.hideLoading();
                    wx.showToast({ title: '打开PDF失败', icon: 'error' });
                    console.error("Failed to open PDF: ", openErr);
                  }
                });
              } else {
                wx.hideLoading();
                wx.showToast({ title: '下载PDF失败', icon: 'error' });
                console.error("Failed to download PDF: ", downloadRes);
              }
            },
            fail: (downloadErr) => {
              wx.hideLoading();
              wx.showToast({ title: '下载PDF失败', icon: 'error' });
              console.error("Error downloading PDF: ", downloadErr);
            }
          });
        } else {
          wx.hideLoading();
          wx.showToast({ title: '生成PDF失败', icon: 'error' });
          console.error("Failed to generate PDF: ", res);
        }
      },
      fail: (reqErr) => {
        wx.hideLoading();
        wx.showToast({ title: '网络错误', icon: 'error' });
        console.error("Error generating PDF: ", reqErr);
      }
    });
  }
});
