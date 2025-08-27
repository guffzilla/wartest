/**
 * PollCreator Module
 * 
 * Handles poll creation functionality for forum posts
 */
export class PollCreator {
  constructor() {
    this.isInitialized = false;
    this.modal = null;
    this.pollData = null;
  }

  /**
   * Initialize the poll creator
   */
  init() {
    if (this.isInitialized) return;this.createModal();
    this.attachEventListeners();
    this.isInitialized = true;
    
    console.log('✅ PollCreator initialized');
  }

  /**
   * Create the poll creation modal
   */
  createModal() {
    const modalHTML = `
      <div id="poll-creator-modal" class="poll-modal" style="display: none;">
        <div class="poll-modal-overlay"></div>
        <div class="poll-modal-content">
          <div class="poll-modal-header">
            <h3>
              <i class="fas fa-poll"></i>
              Create Poll
            </h3>
            <button class="poll-modal-close" id="poll-modal-close">
              <i class="fas fa-times"></i>
            </button>
          </div>
          
          <div class="poll-modal-body">
            <div class="poll-form-group">
              <label for="poll-question">Poll Question</label>
              <input 
                type="text" 
                id="poll-question" 
                placeholder="What would you like to ask the community?"
                maxlength="200"
              />
              <div class="poll-char-count">
                <span id="question-char-count">0</span>/200
              </div>
            </div>
            
            <div class="poll-form-group">
              <label>Poll Options</label>
              <div id="poll-options-container">
                <div class="poll-option-item">
                  <input 
                    type="text" 
                    class="poll-option-input" 
                    placeholder="Option 1"
                    maxlength="100"
                  />
                  <button class="poll-option-remove" disabled>
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
                <div class="poll-option-item">
                  <input 
                    type="text" 
                    class="poll-option-input" 
                    placeholder="Option 2"
                    maxlength="100"
                  />
                  <button class="poll-option-remove" disabled>
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              </div>
              
              <button id="add-poll-option" class="poll-add-option">
                <i class="fas fa-plus"></i>
                Add Option
              </button>
              
              <div class="poll-options-info">
                <i class="fas fa-info-circle"></i>
                You can add up to 10 options
              </div>
            </div>
            
            <div class="poll-form-group">
              <label for="poll-duration">Poll Duration (Optional)</label>
              <select id="poll-duration">
                <option value="">No expiration</option>
                <option value="1">1 hour</option>
                <option value="6">6 hours</option>
                <option value="12">12 hours</option>
                <option value="24">1 day</option>
                <option value="48">2 days</option>
                <option value="72">3 days</option>
                <option value="168">1 week</option>
              </select>
            </div>
          </div>
          
          <div class="poll-modal-footer">
            <button id="poll-cancel-btn" class="btn-secondary">
              <i class="fas fa-times"></i>
              Cancel
            </button>
            <button id="poll-create-btn" class="btn-primary" disabled>
              <i class="fas fa-check"></i>
              Add Poll
            </button>
          </div>
        </div>
      </div>
    `;

    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    this.modal = document.getElementById('poll-creator-modal');
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    const modal = this.modal;
    const questionInput = document.getElementById('poll-question');
    const optionsContainer = document.getElementById('poll-options-container');
    const addOptionBtn = document.getElementById('add-poll-option');
    const createBtn = document.getElementById('poll-create-btn');
    const cancelBtn = document.getElementById('poll-cancel-btn');
    const closeBtn = document.getElementById('poll-modal-close');

    // Close modal events
    [cancelBtn, closeBtn].forEach(btn => {
      btn.addEventListener('click', () => this.hide());
    });

    // Close on overlay click
    modal.querySelector('.poll-modal-overlay').addEventListener('click', () => this.hide());

    // Question input validation
    questionInput.addEventListener('input', (e) => {
      const count = e.target.value.length;
      document.getElementById('question-char-count').textContent = count;
      this.validateForm();
    });

    // Add option button
    addOptionBtn.addEventListener('click', () => this.addOption());

    // Option input events (delegated)
    optionsContainer.addEventListener('input', (e) => {
      if (e.target.classList.contains('poll-option-input')) {
        this.validateForm();
      }
    });

    optionsContainer.addEventListener('click', (e) => {
      if (e.target.closest('.poll-option-remove')) {
        const optionItem = e.target.closest('.poll-option-item');
        this.removeOption(optionItem);
      }
    });

    // Create poll button
    createBtn.addEventListener('click', () => this.createPoll());

    // Escape key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isVisible()) {
        this.hide();
      }
    });
  }

  /**
   * Show the poll creation modal
   */
  show() {
    if (!this.isInitialized) this.init();
    
    this.modal.style.display = 'flex';
    setTimeout(() => {
      this.modal.classList.add('show');
      document.getElementById('poll-question').focus();
    }, 10);
    
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
  }

  /**
   * Hide the poll creation modal
   */
  hide() {
    this.modal.classList.remove('show');
    setTimeout(() => {
      this.modal.style.display = 'none';
      document.body.style.overflow = '';
    }, 300);
    
    // Reset form
    this.resetForm();
  }

  /**
   * Check if modal is visible
   */
  isVisible() {
    return this.modal && this.modal.style.display === 'flex';}

  /**
   * Add a new poll option
   */
  addOption() {
    const container = document.getElementById('poll-options-container');
    const options = container.querySelectorAll('.poll-option-item');
    
    if (options.length >= 10) {
      this.showError('Maximum 10 options allowed');
      return;}

    const optionHTML = `
      <div class="poll-option-item">
        <input 
          type="text" 
          class="poll-option-input" 
          placeholder="Option ${options.length + 1}"
          maxlength="100"
        />
        <button class="poll-option-remove">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    `;

    container.insertAdjacentHTML('beforeend', optionHTML);
    this.updateRemoveButtons();
    this.validateForm();

    // Focus the new input
    const newInput = container.lastElementChild.querySelector('.poll-option-input');
    newInput.focus();
  }

  /**
   * Remove a poll option
   */
  removeOption(optionItem) {
    const container = document.getElementById('poll-options-container');
    optionItem.remove();
    this.updateRemoveButtons();
    this.validateForm();
  }

  /**
   * Update remove button states
   */
  updateRemoveButtons() {
    const container = document.getElementById('poll-options-container');
    const options = container.querySelectorAll('.poll-option-item');
    const removeButtons = container.querySelectorAll('.poll-option-remove');

    removeButtons.forEach(btn => {
      btn.disabled = options.length <= 2;
    });
  }

  /**
   * Validate the poll form
   */
  validateForm() {
    const question = document.getElementById('poll-question').value.trim();
    const options = Array.from(document.querySelectorAll('.poll-option-input'))
      .map(input => input.value.trim())
      .filter(value => value.length > 0);

    const isValid = question.length > 0 && options.length >= 2;
    document.getElementById('poll-create-btn').disabled = !isValid;

    return isValid;}

  /**
   * Create the poll and return poll data
   */
  createPoll() {
    if (!this.validateForm()) {
      this.showError('Please fill in all required fields');return;}

    const question = document.getElementById('poll-question').value.trim();
    const options = Array.from(document.querySelectorAll('.poll-option-input'))
      .map(input => input.value.trim())
      .filter(value => value.length > 0);
    const duration = document.getElementById('poll-duration').value;

    const pollData = {
      question,
      options,
      expiresIn: duration ? parseInt(duration) : null
    };

    this.pollData = pollData;
    this.hide();

    // Dispatch custom event with poll data
    const event = new CustomEvent('pollCreated', { detail: pollData });
    document.dispatchEvent(event);

    console.log('📊 Poll created:', pollData);
  }

  /**
   * Get the created poll data
   */
  getPollData() {
    return this.pollData;}

  /**
   * Reset the form
   */
  resetForm() {
    document.getElementById('poll-question').value = '';
    document.getElementById('question-char-count').textContent = '0';
    document.getElementById('poll-duration').value = '';
    
    const container = document.getElementById('poll-options-container');
    container.innerHTML = `
      <div class="poll-option-item">
        <input 
          type="text" 
          class="poll-option-input" 
          placeholder="Option 1"
          maxlength="100"
        />
        <button class="poll-option-remove" disabled>
          <i class="fas fa-trash"></i>
        </button>
      </div>
      <div class="poll-option-item">
        <input 
          type="text" 
          class="poll-option-input" 
          placeholder="Option 2"
          maxlength="100"
        />
        <button class="poll-option-remove" disabled>
          <i class="fas fa-trash"></i>
        </button>
      </div>
    `;
    
    this.pollData = null;
    this.validateForm();
  }

  /**
   * Show error message
   */
  showError(message) {
    // You can integrate this with your existing notification system
    console.error('Poll Creator Error:', message);
    alert(message); // Temporary - replace with your notification system
  }
} 