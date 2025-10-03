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
    generatedQA: [],
    isPracticeOverlayVisible: false,
    currentQuestionIndex: 0,
    practiceState: 'initial', // 'initial', 'recording', 'feedback'
    timer: '00:00',
    aiFeedback: ''
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

          const generatedQaJson = res.data.generated_qa_json || null;
          let generatedQA = [];
          if (generatedQaJson) {
            try {
              generatedQA = JSON.parse(generatedQaJson);
            } catch (e) {
              console.error("Error parsing generated_qa_json:", e);
            }
          }

          this.setData({ 
            opportunity: res.data,
            jdMarkdown: jdMarkdown,
            generatedResumeMd: generatedResumeMd,
            resumeMarkdown: resumeMarkdown,
            generatedQA: generatedQA,
            qaGenerated: generatedQA.length > 0 // Set qaGenerated flag
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

      // Workaround for auto-height textareas not rendering correctly after tab switch
      if (tab === 'qa') {
        setTimeout(() => {
          // Force a re-render of the Q&A list to trigger auto-height recalculation
          this.setData({ generatedQA: [...this.data.generatedQA] });
        }, 50);
      }
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
    // Check if Q&A already exists
    if (this.data.qaGenerated) {
      wx.showModal({
        title: '重新生成问题',
        content: '该机会已存在面试问题，是否重新生成？重新生成将覆盖原有内容。',
        success: (res) => {
          if (res.confirm) {
            this._callGenerateQaApi();
          } else {
            wx.showToast({ title: '已取消生成', icon: 'none' });
            this.setData({ isGeneratingQa: false }); // Ensure loading state is reset if it was set
          }
        }
      });
    } else {
      this._callGenerateQaApi();
    }
  },

  _callGenerateQaApi: function() {
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
            activeTab: 'qa',
            'opportunity.generated_qa_json': JSON.stringify(res.data.qa_list) // Update the opportunity object
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
    this.setData({
      isPracticeOverlayVisible: true,
      currentQuestionIndex: 0,
      practiceState: 'initial',
      timer: '00:00',
      aiFeedback: ''
    });
    this.displayQuestion();
  },

  displayQuestion: function() {
    const { generatedQA, currentQuestionIndex } = this.data;
    if (generatedQA.length > 0 && currentQuestionIndex < generatedQA.length) {
      this.setData({
        practiceState: 'initial',
        timer: '00:00',
        aiFeedback: ''
      });
    }
  },

  startRecording: function() {
    this.setData({ practiceState: 'recording' });
    // Simulate recording timer
    let seconds = 0;
    this.recordingInterval = setInterval(() => {
      seconds++;
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      const timerString = `${minutes < 10 ? '0' : ''}${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
      this.setData({ timer: timerString });
    }, 1000);
  },

  stopRecording: function() {
    clearInterval(this.recordingInterval);
    this.setData({ practiceState: 'feedback', aiFeedback: '模拟AI反馈：回答得不错，逻辑清晰。可以尝试补充更多数据来支撑你的论点。' });
  },

  showSuggestedAnswer: function() {
    const { generatedQA, currentQuestionIndex } = this.data;
    if (generatedQA.length > 0 && currentQuestionIndex < generatedQA.length) {
      wx.showModal({
        title: '建议答案',
        content: generatedQA[currentQuestionIndex].suggested_answer,
        showCancel: false
      });
    }
  },

  nextQuestion: function() {
    const { generatedQA, currentQuestionIndex } = this.data;
    if (currentQuestionIndex < generatedQA.length - 1) {
      this.setData({ currentQuestionIndex: currentQuestionIndex + 1 });
      this.displayQuestion();
    } else {
      this.finishInterview(false); // Interview completed normally
    }
  },

  closePractice: function() {
    wx.showModal({
      title: '结束面试',
      content: '您确定要提前结束本次面试吗？系统将根据您已完成的回答生成一份评估报告。',
      success: (res) => {
        if (res.confirm) {
          this.finishInterview(true); // Interview interrupted
        }
      }
    });
  },

  finishInterview: function(isInterrupted = false) {
    clearInterval(this.recordingInterval);
    this.setData({ isPracticeOverlayVisible: false });
    // Here you would typically send answers to backend for evaluation
    wx.showToast({ title: '面试完成！正在生成评估报告...', icon: 'loading', duration: 2000 });
    // Simulate report generation and switch to report tab
    setTimeout(() => {
      this.setData({ activeTab: 'report' });
      wx.hideToast();
    }, 2000);
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
    const id = this.data.opportunityId;
    const backendBaseUrl = app.globalData.backendBaseUrl;
    const qaListToSave = this.data.generatedQA;

    wx.request({
      url: `${backendBaseUrl}/opportunity/${id}/update_qa_content`,
      method: 'PUT',
      data: {
        qa_list: qaListToSave
      },
      success: (res) => {
        if (res.statusCode === 200) {
          this.setData({
            'opportunity.generated_qa_json': JSON.stringify(qaListToSave) // Update the opportunity object
          });
          wx.showToast({ title: '问答列表已保存！', icon: 'success' });
        } else {
          wx.showToast({ title: '保存失败', icon: 'error' });
        }
      },
      fail: () => {
        wx.showToast({ title: '网络错误', icon: 'error' });
      }
    });
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
