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
        jdMarkdown: {},
        resumeMarkdown: {},
        tabs: [
            { title: "职位详情", key: "details" },
            { title: "AI简历", key: "resume" },
            { title: "AI问答", key: "qa" },
            { title: "面试评估", key: "report" } // New tab with key
        ],
        activeTab: 'details',
        jdAnalysisResult: null,
        generatedResumeMd: '',
        generatedQaList: [],
        latestInterviewSession: null,
        historicalInterviewSessions: [],
        selectedSessionAnswers: [],
        reportSummaryRichText: null, // New data property for rich text summary
        radarChartDataFormatted: '暂无数据', // New data property for formatted radar data
        activeHistoricalSessionId: null, // New data property to track active historical session
        showEditResumeDialog: false,
        editResumeContent: '',
        showEditQaDialog: false,
        editQaList: [],
        toptips: '',
        showActionSheet: false,
        actions: [
            { name: '下载PDF', value: 'download' }
        ]
    },

    // Helper to show toast messages
    showToast(title, icon = 'none', duration = 2000) {
        wx.showToast({
            title,
            icon,
            duration
        });
    },

    // Function to fetch interview evaluation data
    getInterviewEvaluationData() {
        const opportunityId = this.data.opportunityId;
        if (!opportunityId) return;

        const towxml = new Towxml(); // Initialize Towxml

        // Fetch latest interview session
        wx.request({
            url: `http://127.0.0.1:5000/opportunity/${opportunityId}/interview_sessions/latest`,
            method: 'GET',
            success: (res) => {
                if (res.statusCode === 200 && res.data.id) {
                    const latestSession = res.data;
                    
                    // Convert report_summary to rich text
                    latestSession.reportSummaryRichText = towxml.toJson(latestSession.report_summary || '');

                    // Convert ai_feedback in session_answers to rich text
                    latestSession.session_answers.forEach(answer => {
                        answer.aiFeedbackRichText = towxml.toJson(answer.ai_feedback || '');
                    });

                    // Format radar_chart_data
                    let radarChartDataFormatted = '暂无数据';
                    let radarChartDataArray = [];
                    if (latestSession.radar_chart_data) {
                        console.log('getInterviewEvaluationData: latestSession.radar_chart_data:', latestSession.radar_chart_data);
                        try {
                            const radarData = latestSession.radar_chart_data;
                            radarChartDataArray = Object.entries(radarData)
                                .map(([key, value]) => ({ key: key, value: value }));
                            radarChartDataFormatted = radarChartDataArray
                                .map(item => `${item.key}: ${item.value}分`)
                                .join('\n');
                        } catch (e) {
                            console.error("Error parsing radar_chart_data:", e);
                        }
                    }
                    console.log('getInterviewEvaluationData: radarChartDataArray:', radarChartDataArray);

                    latestSession.radarChartDataArray = radarChartDataArray; // Add to latestSession

                    this.setData({
                        latestInterviewSession: latestSession,
                        selectedSessionAnswers: latestSession.session_answers,
                        reportSummaryRichText: latestSession.reportSummaryRichText,
                        radarChartDataFormatted: radarChartDataFormatted,
                        'latestInterviewSession.radar_chart_data_array': radarChartDataArray,
                        activeHistoricalSessionId: latestSession.id // Set active ID for initial latest session
                    });
                } else if (res.statusCode === 200 && res.data.message === 'No interview sessions found for this opportunity') {
                    this.setData({
                        latestInterviewSession: null,
                        selectedSessionAnswers: [],
                        reportSummaryRichText: null,
                        radarChartDataFormatted: '暂无数据'
                    });
                } else {
                    console.error('Failed to fetch latest interview session:', res);
                    this.showToast('获取最新评估失败', 'error');
                }
            },
            fail: (err) => {
                console.error('Request failed:', err);
                this.showToast('网络错误', 'error');
            }
        });

        // Fetch historical interview sessions
        wx.request({
            url: `http://127.0.0.1:5000/opportunity/${opportunityId}/interview_sessions`,
            method: 'GET',
            success: (res) => {
                if (res.statusCode === 200) {
                    const sortedSessions = res.data.sort((a, b) => new Date(b.session_date) - new Date(a.session_date));
                    
                    // Format radar_chart_data for historical sessions as well
                    sortedSessions.forEach(session => {
                        session.formatted_session_date = new Date(session.session_date).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
                        if (session.radar_chart_data) {
                            try {
                                const radarData = session.radar_chart_data;
                                session.radarChartDataFormatted = Object.entries(radarData)
                                    .map(([key, value]) => `${key}: ${value}分`)
                                    .join(', '); // Use comma for historical list display
                            } catch (e) {
                                console.error("Error parsing historical radar_chart_data:", e);
                            }
                        }
                    });

                    this.setData({
                        historicalInterviewSessions: sortedSessions
                    });
                } else {
                    console.error('Failed to fetch historical interview sessions:', res);
                    this.showToast('获取历史评估失败', 'error');
                }
            },
            fail: (err) => {
                console.error('Request failed:', err);
                this.showToast('网络错误', 'error');
            }
        });
    },

    // Function to load a specific historical session
    loadHistoricalSession(e) {
        const sessionId = e.currentTarget.dataset.sessionId;
        const towxml = new Towxml();

        // Clear previous data to ensure clean state
        this.setData({
            latestInterviewSession: null,
            selectedSessionAnswers: [],
            reportSummaryRichText: null,
            radarChartDataFormatted: '暂无数据',
            'latestInterviewSession.radar_chart_data_array': []
        });

        wx.request({
            url: `http://127.0.0.1:5000/interview_session/${sessionId}`,
            method: 'GET',
            success: (res) => {
                if (res.statusCode === 200) {
                    const selectedSession = res.data;
                    selectedSession.formatted_session_date = new Date(selectedSession.session_date).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

                    // Convert report_summary to rich text
                    selectedSession.reportSummaryRichText = towxml.toJson(selectedSession.report_summary || '');

                    // Convert ai_feedback in session_answers to rich text
                    selectedSession.session_answers.forEach(answer => {
                        answer.aiFeedbackRichText = towxml.toJson(answer.ai_feedback || '');
                    });

                    // Format radar_chart_data
                    let radarChartDataFormatted = '暂无数据';
                    let radarChartDataArray = [];
                    if (selectedSession.radar_chart_data) {
                        console.log('loadHistoricalSession: selectedSession.radar_chart_data:', selectedSession.radar_chart_data);
                        try {
                            const radarData = selectedSession.radar_chart_data;
                            radarChartDataArray = Object.entries(radarData)
                                .map(([key, value]) => ({ key: key, value: value }));
                            radarChartDataFormatted = radarChartDataArray
                                .map(item => `${item.key}: ${item.value}分`)
                                .join('\n');
                        } catch (e) {
                            console.error("Error parsing radar_chart_data:", e);
                        }
                    }
                    console.log('loadHistoricalSession: radarChartDataArray:', radarChartDataArray);

                    selectedSession.radarChartDataArray = radarChartDataArray; // Add to selectedSession

                    this.setData({
                        'latestInterviewSession.overall_score': selectedSession.overall_score,
                        'latestInterviewSession.report_summary': selectedSession.report_summary,
                        'latestInterviewSession.radar_chart_data': selectedSession.radar_chart_data,
                        selectedSessionAnswers: selectedSession.session_answers,
                        reportSummaryRichText: selectedSession.reportSummaryRichText,
                        radarChartDataFormatted: radarChartDataFormatted,
                        'latestInterviewSession.radar_chart_data_array': radarChartDataArray,
                        activeHistoricalSessionId: sessionId // Set active ID for clicked historical session
                    });
                } else {
                    console.error('Failed to fetch historical session:', res);
                    this.showToast('获取历史会话失败', 'error');
                }
            },
            fail: (err) => {
                console.error('Request failed:', err);
                this.showToast('网络错误', 'error');
            }
        });
    },

  onLoad: function (options) {
    // Initialize recorder manager
    const recorderManager = wx.getRecorderManager();
    recorderManager.onStop((res) => {
      console.log('Recorder stopped', res);
      this.setData({ recordedTempFilePath: res.tempFilePath });
      // This part needs to be updated to send to the correct backend endpoint for session answers
      // For now, it's commented out or needs a placeholder
      // this.sendAudioForEvaluation(res.tempFilePath);
    });
    recorderManager.onError((res) => {
      console.error('Recorder error', res);
      wx.showToast({ title: '录音失败', icon: 'error' });
      this.setData({ practiceState: 'initial' });
    });
    this.setData({ recorderManager: recorderManager });

    if (options.id) {
      this.setData({ opportunityId: options.id });
      this.fetchOpportunityDetail();
    }
  },

  onShow: function () {
    if (this.data.opportunityId) {
      this.fetchOpportunityDetail();
      // Also refresh interview evaluation data on show
      this.getInterviewEvaluationData();
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
        let generatedQA = []; // Declare generatedQA at the beginning of the success callback
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
              const parsedQa = JSON.parse(generatedQaJson);
              generatedQA = parsedQa.map(item => ({
                question_text: item.question, // Map 'question' to 'question_text'
                suggested_answer: item.suggested_answer
              }));
            } catch (e) {
              console.error("Error parsing generated_qa_json:", e);
            }
          }

          this.setData({ 
            opportunity: res.data,
            jdMarkdown: jdMarkdown,
            generatedResumeMd: generatedResumeMd,
            resumeMarkdown: resumeMarkdown,
            generatedQaList: generatedQA
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

      // If the 'report' tab is clicked, fetch evaluation data
      if (tab === 'report') {
        this.getInterviewEvaluationData();
      }

      // Workaround for auto-height textareas not rendering correctly after tab switch
      if (tab === 'qa') {
        setTimeout(() => {
          // Force a re-render of the Q&A list to trigger auto-height recalculation
          this.setData({ generatedQaList: [...this.data.generatedQaList] });
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
    if (this.data.generatedQaList.length > 0) {
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
    this.setData({ isGeneratingQa: true });

    const id = this.data.opportunityId;
    const backendBaseUrl = app.globalData.backendBaseUrl;

    wx.request({
      url: `${backendBaseUrl}/opportunity/${id}/generate_qa`,
      method: 'POST',
      success: (res) => {
        if (res.statusCode === 200 && res.data.qa_list) {
          this.setData({
            generatedQaList: res.data.qa_list,
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
    const opportunityId = this.data.opportunityId;
    const backendBaseUrl = app.globalData.backendBaseUrl;

    wx.showLoading({
      title: '正在创建面试会话...',
      mask: true
    });

    wx.request({
      url: `${backendBaseUrl}/opportunity/${opportunityId}/interview_sessions`,
      method: 'POST',
      success: (res) => {
        wx.hideLoading();
        if (res.statusCode === 201 && res.data.id) {
          this.setData({
            currentInterviewSessionId: res.data.id, // Store the new session ID
            generatedQaList: res.data.session_answers, // Use questions from the new session
            isPracticeOverlayVisible: true,
            currentQuestionIndex: 0,
            practiceState: 'initial',
            timer: '00:00',
            aiFeedback: ''
          });
          this.displayQuestion();
        } else {
          wx.showToast({ title: '创建面试会话失败', icon: 'error' });
          console.error('Failed to create interview session:', res);
        }
      },
      fail: (err) => {
        wx.hideLoading();
        wx.showToast({ title: '网络错误', icon: 'error' });
        console.error('Request failed:', err);
      }
    });
  },

  displayQuestion: function() {
    const { generatedQaList, currentQuestionIndex } = this.data;
    if (generatedQaList.length > 0 && currentQuestionIndex < generatedQaList.length) {
      this.setData({
        practiceState: 'initial',
        timer: '00:00',
        aiFeedback: ''
      });
    }
  },

  startRecording: function() {
    this.setData({ practiceState: 'recording' });
    const recorderManager = this.data.recorderManager;
    recorderManager.start({
      duration: 60000, // Max 1 minute
      sampleRate: 16000,
      numberOfChannels: 1,
      encodeBitRate: 96000,
      format: 'mp3',
      frameSize: 50
    });
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
    console.log("stopRecording function called.");
    clearInterval(this.recordingInterval);
    this.data.recorderManager.stop(); // onStop event will trigger sendAudioForEvaluation
  },

  sendAudioForEvaluation: function(filePath) {
    wx.showLoading({
      title: '正在转写并评估...',
      mask: true
    });

    const currentInterviewSessionId = this.data.currentInterviewSessionId;
    const backendBaseUrl = app.globalData.backendBaseUrl;
    const currentQuestion = this.data.generatedQaList[this.data.currentQuestionIndex];

    // Simulate transcription for now
    const mockTranscript = "[模拟转写] " + (Math.random() > 0.5 ? "您的回答很清晰，表达流畅。" : "您的回答有些犹豫，可以更自信一些。");

    wx.request({
      url: `${backendBaseUrl}/interview_session/${currentInterviewSessionId}/answer`,
      method: 'POST',
      header: {
        'Content-Type': 'application/json'
      },
      data: {
        question_text: currentQuestion.question,
        user_answer_transcript: mockTranscript, // Using mock transcript for now
        user_audio_url: filePath // Pass the recorded audio file path
      },
      success: (res) => {
        wx.hideLoading();
        if (res.statusCode === 200) {
          this.setData({
            userAnswerTranscript: res.data.user_answer_transcript,
            aiFeedback: res.data.ai_feedback,
            practiceState: 'feedback'
          });
        } else {
          wx.showToast({ title: '评估失败', icon: 'error' });
          console.error("Evaluation failed: ", res);
          this.setData({ practiceState: 'initial' });
        }
      },
      fail: (err) => {
        wx.hideLoading();
        wx.showToast({ title: '网络错误', icon: 'error' });
        console.error("Network error during evaluation: ", err);
        this.setData({ practiceState: 'initial' });
      }
    });
  },

  showSuggestedAnswer: function() {
    const { generatedQaList, currentQuestionIndex } = this.data;
    if (generatedQaList.length > 0 && currentQuestionIndex < generatedQaList.length) {
      wx.showModal({
        title: '建议答案',
        content: generatedQaList[currentQuestionIndex].suggested_answer,
        showCancel: false
      });
    }
  },

  nextQuestion: function() {
    const { generatedQaList, currentQuestionIndex } = this.data;
    if (currentQuestionIndex < generatedQaList.length - 1) {
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

    const currentInterviewSessionId = this.data.currentInterviewSessionId;
    const backendBaseUrl = app.globalData.backendBaseUrl;

    wx.showLoading({
      title: '正在生成评估报告...',
      mask: true
    });

    wx.request({
      url: `${backendBaseUrl}/interview_session/${currentInterviewSessionId}/finish`,
      method: 'PUT',
      success: (res) => {
        wx.hideLoading();
        if (res.statusCode === 200) {
          wx.showToast({ title: '评估报告已生成！', icon: 'success' });
          this.setData({ activeTab: 'report' });
          this.getInterviewEvaluationData(); // Fetch the newly generated report
        } else {
          wx.showToast({ title: '生成评估报告失败', icon: 'error' });
          console.error('Failed to finish interview session:', res);
        }
      },
      fail: (err) => {
        wx.hideLoading();
        wx.showToast({ title: '网络错误', icon: 'error' });
        console.error('Request failed:', err);
      }
    });
  },

  // --- Q&A List Management --- //
  handleAddQa: function() {
    const newQa = { id: Date.now(), question: '新问题...', suggested_answer: '新答案...' };
    this.setData({
      generatedQaList: [...this.data.generatedQaList, newQa]
    });
  },

  handleQaInputChange: function(e) {
    const { id, field } = e.currentTarget.dataset;
    const value = e.detail.value;
    const index = this.data.generatedQaList.findIndex(qa => qa.id == id);

    if (index !== -1) {
      // Debounce the setData call
      this._debouncedSetQaData(index, field, value);
    }
  },

  // Debounced version of setting QA data
  _debouncedSetQaData: debounce(function(index, field, value) {
    const updatedQA = [...this.data.generatedQaList];
    updatedQA[index][field] = value;
    this.setData({ generatedQaList: updatedQA });
  }, 300), // 300ms debounce delay

  saveQaList: function() {
    const id = this.data.opportunityId;
    const backendBaseUrl = app.globalData.backendBaseUrl;
    const qaListToSave = this.data.generatedQaList;

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
            generatedQaList: this.data.generatedQaList.filter(qa => qa.id != idToDelete)
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
