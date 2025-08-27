/**
 * Blacksmith Page Optimized JavaScript
 * Consolidated functionality for the blacksmith page only
 */
import logger from '/js/utils/logger.js';

class BlacksmithPage {
  constructor() {
    this.isInitialized = false;
    this.pollData = {
      yes: 0,
      no: 0,
      hasVoted: false,
      userVote: null
    };
    this.init();
  }

  async init() {
    if (this.isInitialized) return;try {
      // Initialize components in parallel
      await Promise.all([
        this.initTabs(),
        this.initPoll(),
        this.initFeedbackForm()
      ]);
      
      this.isInitialized = true;
      
      
    } catch (error) {
      logger.error('❌ Blacksmith Page initialization failed:', error);
    }
  }

  /**
   * Initialize tab switching functionality
   */
  initTabs() {
    const tabs = document.querySelectorAll('.blacksmith-tab');
    const panels = document.querySelectorAll('.tab-panel');
    
    if (!tabs.length || !panels.length) {
      
      return;}
    
    // Set first tab as active by default
    if (tabs.length > 0) {
      tabs[0].classList.add('active');
      const firstPanel = document.getElementById(`tab-${tabs[0].dataset.tab}`);
      if (firstPanel) {
        firstPanel.classList.add('active');
        firstPanel.style.display = 'block';
      }
    }
    
    // Add click handlers
    tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        e.preventDefault();
        const targetTab = tab.dataset.tab;
        
        // Remove active class from all tabs and panels
        tabs.forEach(t => t.classList.remove('active'));
        panels.forEach(p => {
          p.classList.remove('active');
          p.style.display = 'none';
        });
        
        // Add active class to clicked tab
        tab.classList.add('active');
        
        // Show corresponding panel
        const targetPanel = document.getElementById(`tab-${targetTab}`);
        if (targetPanel) {
          targetPanel.classList.add('active');
          targetPanel.style.display = 'block';
        }
      });
    });
  }

  /**
   * Initialize poll functionality
   */
  async initPoll() {
    const pollOptions = document.querySelectorAll('.poll-option');
    if (!pollOptions.length) return;try {
      // Load current poll data
      await this.loadPollData();
      
      // Add click handlers for voting
      pollOptions.forEach(option => {
        option.addEventListener('click', () => this.handleVote(option.dataset.option));
      });
      
    } catch (error) {
      logger.error('❌ Failed to initialize poll:', error);
    }
  }

  /**
   * Load current poll data from server
   */
  async loadPollData() {
    try {
      const response = await fetch('/api/poll/divorce', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data && data.options) {
          this.pollData = {
            yes: data.options.find(opt => opt.value === 'yes')?.votes || 0,
            no: data.options.find(opt => opt.value === 'no')?.votes || 0,
            hasVoted: data.hasVoted || false,
            userVote: data.userVote || null
          };
        }
      }
      
      this.updatePollDisplay();
      
      // Show results if user has already voted
      if (this.pollData.hasVoted && this.pollData.userVote) {
        this.showResults();
        this.highlightUserVote(this.pollData.userVote);
        this.showSaveMarriageButton();
      }
      
    } catch (error) {
      logger.error('❌ Failed to load poll data:', error);
    }
  }

  /**
   * Handle vote submission
   */
  async handleVote(vote) {
    try {
      const response = await fetch('/api/poll/vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ 
          poll: 'divorce', 
          vote: vote 
        }),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Vote failed: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      
      if (data.poll && data.poll.options) {
        this.pollData = {
          yes: data.poll.options.find(opt => opt.value === 'yes')?.votes || 0,
          no: data.poll.options.find(opt => opt.value === 'no')?.votes || 0,
          hasVoted: true,
          userVote: vote
        };
        
        this.updatePollDisplay();
        this.showResults();
        this.highlightUserVote(vote);
        this.showVoteMessage(data.message || 'Vote recorded successfully');
        this.showSaveMarriageButton();
      }
      
    } catch (error) {
      logger.error('❌ Vote failed:', error);
      this.showVoteMessage('Failed to record vote. Please try again.');
    }
  }

  /**
   * Update poll display with current data
   */
  updatePollDisplay() {
    const pollOptions = document.querySelectorAll('.poll-option');
    if (!pollOptions.length) return;const total = this.pollData.yes + this.pollData.no;
    if (total > 0) {
      const yesPercent = Math.round((this.pollData.yes / total) * 100);
      const noPercent = Math.round((this.pollData.no / total) * 100);

      // Update yes option
      const yesOption = document.querySelector('.poll-option[data-option="yes"]');
      if (yesOption) {
        yesOption.querySelector('.poll-option-progress').style.width = `${yesPercent}%`;
        yesOption.querySelector('.poll-option-percentage').textContent = `${yesPercent}%`;
        yesOption.querySelector('.poll-option-votes').textContent = `${this.pollData.yes} votes`;
      }

      // Update no option
      const noOption = document.querySelector('.poll-option[data-option="no"]');
      if (noOption) {
        noOption.querySelector('.poll-option-progress').style.width = `${noPercent}%`;
        noOption.querySelector('.poll-option-percentage').textContent = `${noPercent}%`;
        noOption.querySelector('.poll-option-votes').textContent = `${this.pollData.no} votes`;
      }
    }
  }

  /**
   * Show poll results
   */
  showResults() {
    const pollResults = document.getElementById('poll-results');
    if (pollResults) {
      pollResults.classList.remove('hidden');
    }

    // Keep options clickable for vote changing
    const pollOptions = document.querySelectorAll('.poll-option');
    pollOptions.forEach(option => {
      option.style.cursor = 'pointer';
      option.classList.add('voted');
      option.style.opacity = '0.9';
    });
  }

  /**
   * Highlight user's current vote
   */
  highlightUserVote(userVote) {
    const pollOptions = document.querySelectorAll('.poll-option');
    pollOptions.forEach(option => {
      if (option.dataset.option === userVote) {
        option.style.border = '2px solid #ffd700';
        option.style.backgroundColor = 'rgba(255, 215, 0, 0.1)';
        option.style.boxShadow = '0 0 10px rgba(255, 215, 0, 0.3)';
      } else {
        option.style.border = '';
        option.style.backgroundColor = '';
        option.style.boxShadow = '';
      }
    });
  }

  /**
   * Show vote success message
   */
  showVoteMessage(message) {
    let messageEl = document.getElementById('vote-message');
    if (!messageEl) {
      messageEl = document.createElement('div');
      messageEl.id = 'vote-message';
      messageEl.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(40, 167, 69, 0.9);
        color: white;
        padding: 12px 20px;
        border-radius: 6px;
        font-weight: 600;
        z-index: 1000;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      `;
      document.body.appendChild(messageEl);
    }
    
    messageEl.textContent = message;
    
    // Show message
    setTimeout(() => {
      messageEl.style.transform = 'translateX(0)';
    }, 100);
    
    // Hide message after 3 seconds
    setTimeout(() => {
      messageEl.style.transform = 'translateX(100%)';
    }, 3000);
  }

  /**
   * Show "Save My Marriage" button
   */
  showSaveMarriageButton() {
    const saveBtn = document.getElementById('save-marriage-btn');
    if (saveBtn) {
      saveBtn.classList.remove('hidden');
      
      saveBtn.addEventListener('click', function(e) {
        window.location.href = '/views/hero.html';
      });
    }
  }

  /**
   * Initialize feedback form functionality
   */
  initFeedbackForm() {
    const feedbackForm = document.getElementById('feedback-form');
    const contactCheckbox = document.getElementById('feedback-contact');
    const contactInfo = document.getElementById('contact-info');
    
    if (!feedbackForm) return;if (contactCheckbox && contactInfo) {
      contactCheckbox.addEventListener('change', () => {
        if (contactCheckbox.checked) {
          contactInfo.classList.remove('hidden');
        } else {
          contactInfo.classList.add('hidden');
        }
      });
    }
    
    // Handle form submission
    feedbackForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      // Hide previous messages
      const feedbackSuccess = document.getElementById('feedback-success');
      const feedbackError = document.getElementById('feedback-error');
      if (feedbackSuccess) feedbackSuccess.classList.add('hidden');
      if (feedbackError) feedbackError.classList.add('hidden');
      
      // Get form data
      const formData = new FormData(feedbackForm);
      const feedbackData = {
        type: formData.get('type'),
        category: formData.get('category'),
        subject: formData.get('subject'),
        description: formData.get('description'),
        contact: formData.get('contact') === 'on'
      };
      
      // Add contact details if contact is requested
      if (feedbackData.contact) {
        const contactMethod = formData.get('contactMethod');
        const contactDetails = formData.get('contactDetails');
        
        feedbackData.contact = {
          preferredMethod: contactMethod,
          email: contactMethod === 'email' ? contactDetails : '',
          discord: contactMethod === 'discord' ? contactDetails : ''
        };
      }
      
      try {
        const response = await fetch('/api/feedback/submit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(feedbackData),
          credentials: 'include'
        });
        
        const result = await response.json();
        
        if (response.ok) {
          this.showFeedbackSuccess(feedbackData, result.feedbackId);
          feedbackForm.reset();
          if (contactInfo) contactInfo.classList.add('hidden');
        } else {
          throw new Error(result.message || 'Failed to submit feedback');
        }
      } catch (error) {
        logger.error('❌ Error submitting feedback:', error);
        this.showFeedbackError(error.message);
      }
    });
  }

  /**
   * Show feedback success message
   */
  showFeedbackSuccess(feedbackData, feedbackId) {
    const feedbackSuccess = document.getElementById('feedback-success');
    if (!feedbackSuccess) return;const typeMap = {
      bug: '🐛 Bug Report',
      feedback: '💭 General Feedback',
      suggestion: '💡 Suggestion',
      complaint: '😤 Complaint',
      other: '📝 Other'
    };
    
    const categoryMap = {
      ui: '🖥️ User Interface',
      gameplay: '🎮 Gameplay',
      performance: '⚡ Performance',
      account: '👤 Account',
      ladder: '🏆 Ladder',
      chat: '💬 Chat',
      maps: '🗺️ Maps',
      tournaments: '🏅 Tournaments',
      other: 'Other'
    };
    
    const typeLabel = typeMap[feedbackData.type] || feedbackData.type;
    const categoryLabel = categoryMap[feedbackData.category] || feedbackData.category;
    const contactText = feedbackData.contact ? 
      ` We'll contact you via ${feedbackData.contactMethod || 'your preferred method'}.` : 
      '';
    
    const successHTML = `
      <div class="feedback-success-content">
        <div class="feedback-success-header">
          <i class="fas fa-check-circle"></i>
          <h4>Feedback Submitted Successfully!</h4>
        </div>
        <div class="feedback-summary">
          <p><strong>Type:</strong> ${typeLabel}</p>
          <p><strong>Category:</strong> ${categoryLabel}</p>
          <p><strong>Subject:</strong> "${feedbackData.subject}"</p>
          <p><strong>Reference ID:</strong> #${feedbackId?.substring(0, 8) || 'UNKNOWN'}</p>
        </div>
        <div class="feedback-success-footer">
          <p>Thank you for your ${feedbackData.type}! We'll review it shortly and take appropriate action.${contactText}</p>
        </div>
      </div>
    `;
    
    feedbackSuccess.innerHTML = successHTML;
    feedbackSuccess.classList.remove('hidden');
    
    // Auto-hide after 10 seconds
    setTimeout(() => {
      feedbackSuccess.classList.add('hidden');
    }, 10000);
  }

  /**
   * Show feedback error message
   */
  showFeedbackError(errorMessage) {
    const feedbackError = document.getElementById('feedback-error');
    if (!feedbackError) return;const errorHTML = `
      <i class="fas fa-exclamation-triangle"></i>
      <span>Failed to submit feedback: ${errorMessage || 'Please try again.'}</span>
    `;
    
    feedbackError.innerHTML = errorHTML;
    feedbackError.classList.remove('hidden');
    
    // Auto-hide after 8 seconds
    setTimeout(() => {
      feedbackError.classList.add('hidden');
    }, 8000);
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new BlacksmithPage();
  });
} else {
  new BlacksmithPage();
} 