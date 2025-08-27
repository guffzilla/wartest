/**
 * Forum functionality - Enhanced for WC Theme
 */
import logger from '/js/utils/logger.js';

document.addEventListener('DOMContentLoaded', () => {
  

  // DOM elements
  const categoriesView = document.getElementById('categories-view');
  const categoryView = document.getElementById('category-view');
  const topicView = document.getElementById('topic-view');
  const categoryName = document.getElementById('category-name');
  const categoryDescription = document.getElementById('category-description');
  const topicsList = document.getElementById('topics-list');
  const topicTitle = document.getElementById('topic-title-view');
  const topicCategory = document.getElementById('topic-category');
  const topicDate = document.getElementById('topic-date');
  const topicViews = document.getElementById('topic-views');
  const topicReplies = document.getElementById('topic-replies');
  const postsList = document.getElementById('posts-list');
  const replyForm = document.getElementById('reply-form');
  const replyContent = document.getElementById('reply-content');
  const backToCategoriesBtn = document.getElementById('back-to-categories');
  const backToCategoryBtn = document.getElementById('back-to-category');
  const newTopicBtn = document.getElementById('new-topic-btn');
  const newTopicModal = document.getElementById('new-topic-modal');
  const closeModalBtn = document.querySelector('.close-modal');
  const newTopicForm = document.getElementById('new-topic-form');

  // Current state
  let currentTopicId = null;
  let currentCategoryId = null;
  const breadcrumbs = document.getElementById('forum-breadcrumbs');

  // Check for topic parameter in URL
  const urlParams = new URLSearchParams(window.location.search);
  const topicId = urlParams.get('topic');
  

  // Initialize the page based on URL parameters
  async function initializePage() {

    if (topicId) {
      
      await showTopicView(topicId);
    } else {
      
      await loadCategories();
    }
  }

  // Call initializePage immediately
  initializePage().catch(error => {
    logger.error('Forum.js: Error initializing page:', error);
  });

  function updateBreadcrumbs({ category = null, topic = null }) {
    if (!category && !topic) {
      breadcrumbs.style.display = 'none';
      return;}
    
    breadcrumbs.style.display = 'flex';
    let html = `<a href="#" class="breadcrumb-item" data-view="categories">
      <i class="fas fa-home"></i> Forums
    </a>`;
    
    if (category) {
      html += `<span class="breadcrumb-separator"><i class="fas fa-chevron-right"></i></span>
        <a href="#" class="breadcrumb-item" data-view="category" data-id="${category._id}">
          <i class="fas fa-folder"></i> ${category.name}
        </a>`;
    }
    
    if (topic) {
      html += `<span class="breadcrumb-separator"><i class="fas fa-chevron-right"></i></span>
        <span class="breadcrumb-item">
          <i class="fas fa-comments"></i> ${topic.title}
        </span>`;
    }
    
    breadcrumbs.innerHTML = html;

    // Add click handlers
    breadcrumbs.querySelectorAll('.breadcrumb-item[data-view]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const view = link.dataset.view;
        if (view === 'categories') {
          showCategoriesView();
        } else if (view === 'category') {
          loadCategoryTopics(link.dataset.id);
        }
      });
    });
  }

  // Event listeners
  backToCategoriesBtn.addEventListener('click', showCategoriesView);
  backToCategoryBtn.addEventListener('click', () => {
    if (currentCategoryId) {
      loadCategoryTopics(currentCategoryId);
    } else {
      showCategoriesView();
    }
  });
  newTopicBtn.addEventListener('click', () => {
    if (categoryView.classList.contains('active') && currentCategoryId) {
      showNewTopicModal(currentCategoryId);
    } else {
      showNewTopicModal();
    }
  });
  closeModalBtn.addEventListener('click', hideNewTopicModal);
  newTopicForm.addEventListener('submit', handleNewTopicSubmit);
  replyForm.addEventListener('submit', handleReplySubmit);

  // Check if user is authenticated
  checkAuthStatus();

  // Close modal when clicking outside
  window.addEventListener('click', (event) => {
    if (event.target === newTopicModal) {
      hideNewTopicModal();
    }
  });

  // Initialize forum features
  initializeLikeDislikeButtons();
  initializeEditDeleteButtons();
  initializeStickyPosts();

  function showError(message) {
    const notification = document.createElement('div');
    notification.className = 'notification error';
    notification.innerHTML = `
      <i class="fas fa-exclamation-circle"></i>
      <span>${message}</span>
      <button onclick="this.parentElement.remove()">
        <i class="fas fa-times"></i>
      </button>
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 5000);
  }

  function showSuccess(message) {
    const notification = document.createElement('div');
    notification.className = 'notification success';
    notification.innerHTML = `
      <i class="fas fa-check-circle"></i>
      <span>${message}</span>
      <button onclick="this.parentElement.remove()">
        <i class="fas fa-times"></i>
      </button>
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
  }

  /**
   * Load forum categories
   */
  async function loadCategories() {
    try {
      categoriesView.innerHTML = '<div class="loading-spinner">Loading categories...</div>';
      showView(categoriesView);

      const response = await fetch('/api/forum/categories');
      if (!response.ok) {
        throw new Error('Failed to load categories');
      }

      const categories = await response.json();
      renderCategories(categories);
      updateBreadcrumbs({});
    } catch (error) {
      logger.error('Error loading categories:', error);
      categoriesView.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-exclamation-triangle"></i>
          <h3>Failed to Load Categories</h3>
          <p>There was an error loading the forum categories. Please try again.</p>
          <button class="btn btn-primary" onclick="loadCategories()">
            <i class="fas fa-sync"></i> Retry
          </button>
        </div>
      `;
    }
  }

  /**
   * Render categories with new design
   */
  function renderCategories(categories) {
    if (categories.length === 0) {
      categoriesView.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-comments"></i>
          <h3>No Categories Available</h3>
          <p>The forum categories haven't been set up yet. Check back later!</p>
        </div>
      `;
      return;}

    const html = `
      <div class="categories-grid">
        ${categories.map(category => {
          const lastPost = category.lastPost 
            ? `<div class="last-post">
                <div class="last-post-author">by ${category.lastPost.username}</div>
                <div class="last-post-time">${formatDate(category.lastPost.date, true)}</div>
               </div>`
            : `<div class="last-post">
                <div class="last-post-author">No posts yet</div>
                <div class="last-post-time">Be the first!</div>
               </div>`;

          // Choose appropriate icon based on category name
          let icon = 'fas fa-comments';
          const name = category.name.toLowerCase();
          if (name.includes('strategy') || name.includes('tactics')) icon = 'fas fa-chess';
          else if (name.includes('general') || name.includes('discussion')) icon = 'fas fa-comment-dots';
          else if (name.includes('war3') || name.includes('wc')) icon = 'fas fa-sword';
          else if (name.includes('tournament') || name.includes('competition')) icon = 'fas fa-trophy';
          else if (name.includes('clan') || name.includes('guild')) icon = 'fas fa-shield-alt';
          else if (name.includes('help') || name.includes('support')) icon = 'fas fa-question-circle';
          else if (name.includes('news') || name.includes('announcement')) icon = 'fas fa-bullhorn';

          return `
            <div class="category-card" data-id="${category._id}">
              <div class="category-header">
                <div class="category-icon">
                  <i class="${icon}"></i>
                </div>
                <div class="category-info">
                  <h3>${category.name}</h3>
                </div>
              </div>
              <div class="category-description">${category.description}</div>
              <div class="category-stats">
                <div class="category-stats-left">
                  <div class="category-stat">
                    <i class="fas fa-comments"></i>
                    <span>${category.topicCount || 0}</span>
                  </div>
                  <div class="category-stat">
                    <i class="fas fa-comment"></i>
                    <span>${category.postCount || 0}</span>
                  </div>
                </div>
                ${lastPost}
              </div>
            </div>
          `;}).join('')}
      </div>
    `;

    categoriesView.innerHTML = html;

    // Add click event to category cards with staggered animation
    const categoryCards = document.querySelectorAll('.category-card');
    categoryCards.forEach((card, index) => {
      // Add initial hidden state for animation
      card.style.opacity = '0';
      card.style.transform = 'translateY(20px)';
      card.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
      
      // Animate in with stagger
      setTimeout(() => {
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
      }, index * 100);
      
      // Add click event
      card.addEventListener('click', () => {
        const categoryId = card.dataset.id;
        loadCategoryTopics(categoryId);
      });
    });
  }

  /**
   * Load topics for a category
   */
  async function loadCategoryTopics(categoryId) {
    try {
      currentCategoryId = categoryId;
      
      topicsList.innerHTML = '<div class="loading-spinner">Loading topics...</div>';
      showView(categoryView);

      const response = await fetch(`/api/forum/category/${categoryId}`);
      if (!response.ok) {
        throw new Error('Failed to load topics');
      }

      const data = await response.json();
      const { category, topics } = data;

      categoryName.textContent = category.name;
      categoryDescription.textContent = category.description;
      categoryView.dataset.categoryId = categoryId;

      renderTopics(topics);
      updateBreadcrumbs({ category });
    } catch (error) {
      logger.error('Error loading topics:', error);
      topicsList.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-exclamation-triangle"></i>
          <h3>Failed to Load Topics</h3>
          <p>There was an error loading the topics. Please try again.</p>
          <button class="btn btn-primary" onclick="loadCategoryTopics('${categoryId}')">
            <i class="fas fa-sync"></i> Retry
          </button>
        </div>
      `;
    }
  }

  /**
   * Show categories view
   */
  function showCategoriesView() {
    showView(categoriesView);
  }

  /**
   * Show a specific view and hide others
   * @param {HTMLElement} viewToShow - View to show
   */
  function showView(viewToShow) {
    

    // Hide all views first
    [categoriesView, categoryView, topicView].forEach(view => {
      if (view) {
        view.style.display = 'none';

      }
    });

    // Show the requested view
    if (viewToShow) {
      viewToShow.style.display = 'block';
      

      // If showing topic view, ensure the container is visible
      if (viewToShow === topicView) {
        const topicContainer = document.querySelector('.topic-container');
        if (topicContainer) {
          topicContainer.style.display = 'block';
  
        }
      }
    }
  }

  /**
   * Format date to readable string
   * @param {string|Date} dateString - Date string or Date object
   * @param {boolean} compact - Whether to use compact format
   * @returns {string} - Formatted date string
   */
  function formatDate(dateString, compact = false) {
    const date = new Date(dateString);if (compact) {
      // For topics list, use a more compact format
      const now = new Date();
      const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        // Today, just show time
        return date.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit'
        });} else if (diffDays === 1) {
        return 'Yesterday';} else if (diffDays < 7) {
        // Within a week, show day name
        return date.toLocaleDateString('en-US', {
          weekday: 'short'
        });} else {
        // Older, show short date
        return date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric'
        });}
    } else {
      // Full format for post details
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });}
  }

  /**
   * Check if user is authenticated and update UI accordingly
   */
  async function checkAuthStatus() {
    try {
      const response = await fetch('/api/me', { credentials: 'include' });

      if (response.ok) {
        // User is authenticated, show new topic button
        newTopicBtn.style.display = 'block';

        // Also show reply form in topic view
        if (replyForm) {
          replyForm.style.display = 'block';
        }
      } else {
        // User is not authenticated, hide new topic button
        newTopicBtn.style.display = 'none';

        // Add login prompt
        const categoryActions = document.querySelector('.category-actions');
        if (categoryActions) {
          const loginPrompt = document.createElement('div');
          loginPrompt.className = 'login-prompt';
          loginPrompt.innerHTML = '<a href="/views/login.html">Log in</a> to create new topics';
          categoryActions.appendChild(loginPrompt);
        }

        // Also hide reply form in topic view and show login prompt
        if (replyForm) {
          replyForm.style.display = 'none';

          const replyContainer = document.getElementById('reply-form-container');
          if (replyContainer) {
            replyContainer.innerHTML = `
              <div class="login-prompt">
                <p><a href="/views/login.html">Log in</a> to reply to this topic</p>
              </div>
            `;
          }
        }
      }
    } catch (error) {
      logger.error('Error checking auth status:', error);
      // Hide new topic button on error
      newTopicBtn.style.display = 'none';
    }
  }

  // Like/Dislike functionality
  function initializeLikeDislikeButtons() {
    document.querySelectorAll('.like-button, .dislike-button').forEach(button => {
      button.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();

        // Check if user is authenticated
        try {
          const authResponse = await fetch('/api/me', { credentials: 'include' });
          if (!authResponse.ok) {
            alert('Please log in to like/dislike content');
            return;}
          const userData = await authResponse.json();

          const postId = button.dataset.postId;
          const contentType = button.dataset.contentType;
          const action = button.classList.contains('like-button') ? 'like' : 'dislike';

          // Use the correct endpoint based on content type
          const endpoint = contentType === 'topic'
            ? `/api/forum/topic/${postId}/${action}`
            : `/api/forum/post/${postId}/${action}`;

          const response = await fetch(endpoint, {
            method: 'POST',
            credentials: 'include'
          });

          if (!response.ok) {
            throw new Error('Failed to update like/dislike');
          }

          const data = await response.json();

          // Update UI - Fix: Change .post-card to .post-item to match actual HTML structure
          const postItem = button.closest('.post-item');
          const likeButton = postItem.querySelector('.like-button');
          const dislikeButton = postItem.querySelector('.dislike-button');
          const likeCount = postItem.querySelector('.like-count');
          const dislikeCount = postItem.querySelector('.dislike-count');

          if (likeButton && dislikeButton && likeCount && dislikeCount) {
            // Remove active class from both buttons
            likeButton.classList.remove('active');
            dislikeButton.classList.remove('active');

            // Add active class to the appropriate button - Fix: Use userData.id instead of userData._id
            const userId = userData.id || userData._id;
            if (data.likes && data.likes.some(id => id.toString() === userId)) {
              likeButton.classList.add('active');
            } else if (data.dislikes && data.dislikes.some(id => id.toString() === userId)) {
              dislikeButton.classList.add('active');
            }

            // Update counts
            likeCount.textContent = data.likes ? data.likes.length : 0;
            dislikeCount.textContent = data.dislikes ? data.dislikes.length : 0;
          }
        } catch (error) {
          logger.error('Error updating like/dislike:', error);
          alert('Failed to update like/dislike. Please try again.');
        }
      });
    });
  }

  // Edit/Delete functionality
  function initializeEditDeleteButtons() {
    // Edit buttons
    document.querySelectorAll('.edit-button').forEach(button => {
      button.addEventListener('click', async (e) => {
        const contentType = e.currentTarget.dataset.contentType;
        const postId = e.currentTarget.dataset.postId;
        const postItem = e.currentTarget.closest('.post-item');
        const contentDiv = postItem.querySelector('.post-content');
        const currentContent = contentDiv.textContent;

        // Create edit form
        const editForm = document.createElement('div');
        editForm.className = 'edit-form';
        editForm.innerHTML = `
          <textarea class="edit-content">${currentContent}</textarea>
          <div class="edit-buttons">
            <button class="save-edit">Save</button>
            <button class="cancel-edit">Cancel</button>
          </div>
        `;

        // Replace content with edit form
        contentDiv.style.display = 'none';
        postItem.insertBefore(editForm, contentDiv);

        // Handle save
        editForm.querySelector('.save-edit').addEventListener('click', async () => {
          const newContent = editForm.querySelector('.edit-content').value;

          try {
            const response = await fetch(`/api/forum/${contentType}/${postId}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ content: newContent }),
              credentials: 'include'
            });

            if (!response.ok) {
              throw new Error('Failed to update content');
            }

            const updatedContent = await response.json();
            contentDiv.textContent = updatedContent.content;
            contentDiv.style.display = 'block';
            editForm.remove();
          } catch (error) {
            logger.error('Error updating content:', error);
            showError('Failed to update content. Please try again.');
          }
        });

        // Handle cancel
        editForm.querySelector('.cancel-edit').addEventListener('click', () => {
          contentDiv.style.display = 'block';
          editForm.remove();
        });
      });
    });

    document.querySelectorAll('.delete-button').forEach(button => {
      button.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Add null check for currentTarget
        if (!e.currentTarget) {
          logger.error('Delete button currentTarget is null');
          return;}
        
        const contentType = e.currentTarget.dataset.contentType;
        const contentId = e.currentTarget.dataset.contentId;
        
        // Validate required data
        if (!contentType || !contentId) {
          logger.error('Missing content type or ID for delete operation');
          alert('Error: Missing required data for deletion');
          return;}
        
        if (!confirm('Are you sure you want to delete this content? This action cannot be undone.')) {
          return;}
        
        try {
          const response = await fetch(`/api/forum/${contentType}/${contentId}`, {
            method: 'DELETE',
            credentials: 'include'
          });
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Failed to delete content');
          }
          
          // Handle UI updates based on content type
          if (contentType === 'topic') {
            // For topics, redirect to category view
            const categoryId = currentCategoryId;
            if (categoryId) {
              showCategory(categoryId);
            } else {
              // Fallback to categories view if no current category
              showCategoriesView();
            }
          } else {
            // For posts, remove from UI - Fix: Change .post-card to .post-item
            const postItem = e.currentTarget.closest('.post-item');
            if (postItem) {
              postItem.remove();
            } else {
              // Alternative selectors in case post-item class is different
              const postElement = e.currentTarget.closest('.post') || 
                                 e.currentTarget.closest('.forum-post') ||
                                 e.currentTarget.closest('[data-post-id]');
              if (postElement) {
                postElement.remove();
              }
            }
          }
          
          // Show success message
  
          
        } catch (error) {
          logger.error('Error deleting content:', error);
          if (typeof showError === 'function') {
            showError('Failed to delete content. Please try again.');
          } else {
            alert('Failed to delete content. Please try again.');
          }
        }
      });
    });
  }

  // Sticky posts functionality
  function initializeStickyPosts() {
    const stickyButton = document.getElementById('sticky-button');
    if (!stickyButton) return;stickyButton.addEventListener('click', async () => {
      const topicId = new URLSearchParams(window.location.search).get('topic');
      async function toggleSticky(topicId) {
        const button = document.querySelector(`.sticky-button[data-topic-id="${topicId}"]`);
        const topicCard = document.querySelector(`.topic-card[data-id="${topicId}"]`);
        const isPinned = topicCard.classList.contains('pinned-topic');
        
        try {
          // Optimistically update the UI
          button.disabled = true;
          button.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${isPinned ? 'Unpinning...' : 'Pinning...'}`;
          
          const response = await fetch(`/api/forum/topic/${topicId}/sticky`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            credentials: 'include'
          });

          if (!response.ok) {
            throw new Error('Failed to toggle sticky status');
          }

          const data = await response.json();
          showNotification(data.message, 'success');
          
          // Update the UI immediately
          if (isPinned) {
            topicCard.classList.remove('pinned-topic');
            const pinnedBadge = topicCard.querySelector('.pinned-badge');
            if (pinnedBadge) {
              pinnedBadge.remove();
            }
            button.innerHTML = '<i class="fas fa-thumbtack"></i> Pin';
            button.title = 'Pin Topic';
          } else {
            topicCard.classList.add('pinned-topic');
            const pinnedBadge = document.createElement('div');
            pinnedBadge.className = 'pinned-badge';
            pinnedBadge.innerHTML = '<i class="fas fa-thumbtack"></i>';
            topicCard.prepend(pinnedBadge);
            button.innerHTML = '<i class="fas fa-thumbtack"></i> Unpin';
            button.title = 'Unpin Topic';
            
            // Move the topic to the top if not already there
            const topicsList = document.querySelector('.topics-list');
            if (topicsList && topicsList.firstChild !== topicCard) {
              topicsList.insertBefore(topicCard, topicsList.firstChild);
            }
          }
          
          // Reinitialize the sticky button to ensure click handler is attached
          initializeStickyButtons();
          
        } catch (error) {
          logger.error('Error toggling sticky status:', error);
          showNotification('Failed to update topic status', 'error');
          
          // Revert the UI on error
          button.innerHTML = `<i class="fas fa-thumbtack"></i> ${isPinned ? 'Unpin' : 'Pin'}`;
          button.title = isPinned ? 'Unpin Topic' : 'Pin Topic';
        } finally {
          button.disabled = false;
        }
      }
      toggleSticky(topicId);
    });
  }

  function initializeReportButtons() {
    document.querySelectorAll('.report-button').forEach(button => {
      button.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();

        const contentId = button.dataset.contentId;
        const contentType = button.dataset.contentType;

        const reason = prompt('Please enter the reason for reporting this content:');
        if (!reason) return;try {
          const response = await fetch('/api/forum/flag', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              contentType,
              contentId,
              reason
            }),
            credentials: 'include'
          });

          if (!response.ok) {
            throw new Error('Failed to submit report');
          }

          alert('Content has been reported. Thank you for helping keep our community safe.');
        } catch (error) {
          logger.error('Error submitting report:', error);
          alert('Failed to submit report. Please try again.');
        }
      });
    });
  }

  function initializeStickyButtons() {
    document.querySelectorAll('.sticky-button').forEach(button => {
      button.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();

        const topicId = button.dataset.topicId;
        if (!topicId) return;const topicCard = button.closest('.topic-card');
        const isPinned = topicCard.classList.contains('pinned-topic');
        
        try {
          // Optimistically update the UI
          button.disabled = true;
          button.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${isPinned ? 'Unpinning...' : 'Pinning...'}`;
          
          const response = await fetch(`/api/forum/topic/${topicId}/sticky`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            credentials: 'include'
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to toggle sticky status');
          }

          const data = await response.json();
          
          // Update the UI immediately
          if (isPinned) {
            topicCard.classList.remove('pinned-topic');
            const pinnedBadge = topicCard.querySelector('.pinned-badge');
            if (pinnedBadge) {
              pinnedBadge.remove();
            }
            button.innerHTML = '<i class="fas fa-thumbtack"></i> Pin';
            button.title = 'Pin Topic';
          } else {
            topicCard.classList.add('pinned-topic');
            const pinnedBadge = document.createElement('div');
            pinnedBadge.className = 'pinned-badge';
            pinnedBadge.innerHTML = '<i class="fas fa-thumbtack"></i>';
            topicCard.insertBefore(pinnedBadge, topicCard.firstChild);
            button.innerHTML = '<i class="fas fa-thumbtack"></i> Unpin';
            button.title = 'Unpin Topic';
            
            // Move the topic to the top if not already there
            const topicsList = document.querySelector('.topics-list');
            if (topicsList && topicsList.firstChild !== topicCard) {
              topicsList.insertBefore(topicCard, topicsList.firstChild);
            }
          }
          
          showNotification(data.message || 'Topic updated successfully', 'success');
          
        } catch (error) {
          logger.error('Error toggling sticky status:', error);
          showNotification(error.message || 'Failed to update topic status', 'error');
          
          // Revert the UI on error
          button.innerHTML = `<i class="fas fa-thumbtack"></i> ${isPinned ? 'Unpin' : 'Pin'}`;
          button.title = isPinned ? 'Unpin Topic' : 'Pin Topic';
        } finally {
          button.disabled = false;
        }
      });
    });
  }

  async function showCategory(categoryId) {
    currentCategoryId = categoryId;
    showView('category-view');
    await loadCategoryTopics(categoryId);
  }

  function embedYouTubeVideos(content) {
    // Regular expression to match YouTube URLs
    const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/g;
    
    // Replace YouTube URLs with embedded iframes
    return content.replace(youtubeRegex, (match, videoId) => {
      return `<div class="youtube-embed">
        <iframe 
          width="560" 
          height="315" 
          src="https://www.youtube.com/embed/${videoId}" 
          frameborder="0" 
          allow="accelerometer;autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
          allowfullscreen>
        </iframe>
      </div>`;
    });
  }

  /**
   * Render topics with new design
   */
  function renderTopics(topics) {
    
    
    if (topics.length === 0) {
      topicsList.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-comments"></i>
          <h3>No Topics Found</h3>
          <p>Be the first to start a discussion in this category!</p>
          <button class="btn btn-primary" onclick="showNewTopicModal('${currentCategoryId}')">
            <i class="fas fa-plus"></i> Start Discussion
          </button>
        </div>
      `;
      return;}

    // Sort topics: pinned first, then by date
    topics.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;if (!a.isPinned && b.isPinned) return 1;return new Date(b.createdAt) - new Date(a.createdAt);});

    const html = topics.map(topic => {
      const lastReply = topic.lastReply
        ? `<div class="last-post-author">by ${topic.lastReply.username}</div>
           <div class="last-post-time">${formatDate(topic.lastReply.date, true)}</div>`
        : `<div class="last-post-author">No replies yet</div>
           <div class="last-post-time">Start the conversation!</div>`;

      const statusClass = topic.isPinned ? 'pinned' : (topic.replyCount > 0 ? 'read' : 'unread');
      const statusIcon = topic.isPinned ? 'fa-thumbtack' : (topic.replyCount > 0 ? 'fa-comment' : 'fa-comment-alt');

      const canStick = isOwnerOrModerator(topic.author.userId);
      const stickyButton = canStick ? `
        <button class="sticky-button" data-topic-id="${topic._id}" title="${topic.isPinned ? 'Unpin Topic' : 'Pin Topic'}">
          <i class="fas fa-thumbtack"></i>
        </button>` : '';

      return `
        <div class="topic-item" data-id="${topic._id}">
          <div class="topic-status ${statusClass}">
            <i class="fas ${statusIcon}"></i>
          </div>
          <div class="topic-main">
            <div class="topic-title">${topic.title}</div>
            <div class="topic-meta">
              <span class="topic-author">by ${topic.author.username}</span>
              <span>•</span>
              <span>${formatDate(topic.createdAt, true)}</span>
              ${topic.isPinned ? '<span class="pinned-indicator"><i class="fas fa-thumbtack"></i> Pinned</span>' : ''}
            </div>
          </div>
          <div class="topic-stats">
            <div class="topic-replies">${topic.replyCount || 0}</div>
            <div class="topic-views">${topic.viewCount || 0} views</div>
          </div>
          <div class="topic-last-post">
            ${lastReply}
          </div>
          <div class="topic-actions" style="display: none;">
            ${stickyButton}
            <button class="report-button" data-content-type="topic" data-content-id="${topic._id}" title="Report Topic">
              <i class="fas fa-flag"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');

    topicsList.innerHTML = html;

    // Add click event to topic items
    document.querySelectorAll('.topic-item').forEach(item => {
      item.addEventListener('click', (e) => {
        // Don't trigger if clicking on action buttons
        if (e.target.closest('.topic-actions')) return;const topicId = item.dataset.id;
        showTopicView(topicId);
      });
    });

    // Initialize interactive features
    initializeStickyButtons();
    initializeReportButtons();
  }

  /**
   * Show topic view with posts
   */
  async function showTopicView(topicId) {
    
    currentTopicId = topicId;
    let categoryObj = null;

    postsList.innerHTML = '<div class="loading-spinner">Loading posts...</div>';
    showView(topicView);

    try {
      
      const response = await fetch(`/api/forum/topic/${topicId}`);

      if (!response.ok) {
        throw new Error('Failed to load topic');
      }

      const data = await response.json();
      
      const { topic, posts } = data;

      // Update topic header
      topicTitle.textContent = topic.title;

      if (topic.category) {
        try {
  
          const categoryResponse = await fetch(`/api/forum/category/${topic.category}`);
          if (categoryResponse.ok) {
            const categoryData = await categoryResponse.json();
            topicCategory.innerHTML = `<i class="fas fa-folder"></i> ${categoryData.category.name}`;
            categoryObj = { _id: topic.category, name: categoryData.category.name };
            currentCategoryId = topic.category;
          } else {
            topicCategory.innerHTML = `<i class="fas fa-folder"></i> Forum Topic`;
          }
        } catch (error) {
          logger.error('Forum.js: Error fetching category:', error);
          topicCategory.innerHTML = `<i class="fas fa-folder"></i> Forum Topic`;
        }
      } else {
        topicCategory.innerHTML = `<i class="fas fa-folder"></i> Uncategorized`;
      }

      updateBreadcrumbs({ category: categoryObj, topic });

      topicDate.innerHTML = `<i class="far fa-calendar-alt"></i> Posted on ${formatDate(topic.createdAt)}`;
      topicViews.innerHTML = `<i class="far fa-eye"></i> ${topic.viewCount} views`;
      topicReplies.innerHTML = `<i class="far fa-comment"></i> ${topic.replyCount} replies`;

      await renderPosts(topic, posts);
      showView(topicView);

      // Handle URL hash scrolling
      const hash = window.location.hash;
      if (hash) {
        setTimeout(() => {
          const postElement = document.querySelector(hash);
          if (postElement) {
            postElement.scrollIntoView({ behavior: 'smooth' });
            postElement.classList.add('highlight-post');
            setTimeout(() => postElement.classList.remove('highlight-post'), 3000);
          }
        }, 500);
      } else {
        window.scrollTo(0, 0);
      }
    } catch (error) {
      logger.error('Forum.js: Error loading topic:', error);
      postsList.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-exclamation-triangle"></i>
          <h3>Failed to Load Topic</h3>
          <p>There was an error loading the topic. Please try again.</p>
          <button class="btn btn-primary" onclick="showTopicView('${topicId}')">
            <i class="fas fa-sync"></i> Retry
          </button>
        </div>
      `;
    }

    if (categoryObj) {
      topicCategory.onclick = () => loadCategoryTopics(categoryObj._id);
      topicCategory.style.cursor = 'pointer';
    }
  }

  /**
   * Render posts with enhanced design
   */
  async function renderPosts(topic, posts) {
    let html = '';

    // Get player rank for topic author
    let topicAuthorRank = null;
    if (topic.author && topic.author.userId) {
      if (playerRankCache.has(topic.author.userId)) {
        topicAuthorRank = playerRankCache.get(topic.author.userId);
      } else {
        topicAuthorRank = await fetchPlayerRank(topic.author.userId);
        if (topicAuthorRank) {
          playerRankCache.set(topic.author.userId, topicAuthorRank);
        }
      }
    }

    // First post (topic content)
    html += `
      <div id="post-${topic._id}" class="post-item" data-post-id="${topic._id}" data-content-type="topic">
        <div class="post-author-section">
          <img class="post-avatar" src="${topicAuthorRank?.rank?.image || '/images/default-avatar.png'}" alt="${topic.author.username}" onerror="this.src='/images/default-avatar.png'">
          <div class="post-author-name">${topic.author.username}</div>
          <div class="post-author-role">${getUserRole(topic.author)}</div>
          ${topicAuthorRank ? `<div class="post-author-stats">${topicAuthorRank.rank.name}</div>` : ''}
        </div>
        <div class="post-content-section">
          <div class="post-content">${embedYouTubeVideos(topic.content)}</div>
          <div class="post-footer">
            <div class="post-date">
              <i class="far fa-clock"></i> ${formatDate(topic.createdAt)}
            </div>
            <div class="post-actions">
              <button class="post-action-btn like-button" data-post-id="${topic._id}" data-content-type="topic">
                <i class="fas fa-thumbs-up"></i> <span class="like-count">${topic.likes ? topic.likes.length : 0}</span>
              </button>
              <button class="post-action-btn dislike-button" data-post-id="${topic._id}" data-content-type="topic">
                <i class="fas fa-thumbs-down"></i> <span class="dislike-count">${topic.dislikes ? topic.dislikes.length : 0}</span>
              </button>
              ${isOwnerOrModerator(topic.author.userId) ? `
                <button class="post-action-btn edit-button" data-content-type="topic" data-post-id="${topic._id}">
                  <i class="fas fa-edit"></i>
                </button>
                <button class="post-action-btn delete-button" data-content-type="topic" data-content-id="${topic._id}">
                  <i class="fas fa-trash"></i>
                </button>
              ` : ''}
              <button class="post-action-btn report-button" data-content-type="topic" data-content-id="${topic._id}">
                <i class="fas fa-flag"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Fetch player ranks for reply authors
    const postAuthors = posts.map(post => post.author).filter(author => author && author.userId);
    const uniqueAuthorIds = [...new Set(postAuthors.map(author => author.userId))];
    const authorIdsToFetch = uniqueAuthorIds.filter(id => !playerRankCache.has(id));
    
    if (authorIdsToFetch.length > 0) {
      const rankPromises = authorIdsToFetch.map(async (userId) => {
        const rank = await fetchPlayerRank(userId);
        if (rank) {
          playerRankCache.set(userId, rank);
        }
        return { userId, rank };});
      await Promise.all(rankPromises);
    }

    // Render reply posts
    posts.forEach(post => {
      const postAuthorRank = post.author && post.author.userId ? playerRankCache.get(post.author.userId) : null;

      html += `
        <div id="post-${post._id}" class="post-item" data-post-id="${post._id}" data-content-type="post">
          <div class="post-author-section">
            <img class="post-avatar" src="${postAuthorRank?.rank?.image || '/images/default-avatar.png'}" alt="${post.author.username}" onerror="this.src='/images/default-avatar.png'">
            <div class="post-author-name">${post.author.username}</div>
            <div class="post-author-role">${getUserRole(post.author)}</div>
            ${postAuthorRank ? `<div class="post-author-stats">${postAuthorRank.rank.name}</div>` : ''}
          </div>
          <div class="post-content-section">
            <div class="post-content">${embedYouTubeVideos(post.content)}</div>
            <div class="post-footer">
              <div class="post-date">
                <i class="far fa-clock"></i> ${formatDate(post.createdAt)}
                ${post.isEdited ? `<span class="edited-indicator"><i class="fas fa-pen-to-square"></i> edited ${formatDate(post.editedAt)}</span>` : ''}
              </div>
              <div class="post-actions">
                <button class="post-action-btn like-button" data-post-id="${post._id}" data-content-type="post">
                  <i class="fas fa-thumbs-up"></i> <span class="like-count">${post.likes ? post.likes.length : 0}</span>
                </button>
                <button class="post-action-btn dislike-button" data-post-id="${post._id}" data-content-type="post">
                  <i class="fas fa-thumbs-down"></i> <span class="dislike-count">${post.dislikes ? post.dislikes.length : 0}</span>
                </button>
                ${isOwnerOrModerator(post.author.userId) ? `
                  <button class="post-action-btn edit-button" data-content-type="post" data-post-id="${post._id}">
                    <i class="fas fa-edit"></i>
                  </button>
                  <button class="post-action-btn delete-button" data-content-type="post" data-content-id="${post._id}">
                    <i class="fas fa-trash"></i>
                  </button>
                ` : ''}
                <button class="post-action-btn report-button" data-content-type="post" data-content-id="${post._id}">
                  <i class="fas fa-flag"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    });

    postsList.innerHTML = html;

    // Show/hide reply form based on topic locked status
    const replyContainer = document.getElementById('reply-form-container');
    if (topic.isLocked) {
      replyContainer.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-lock"></i>
          <h3>Topic Locked</h3>
          <p>This topic has been locked by a moderator. No new replies can be added.</p>
        </div>
      `;
    } else {
      replyContainer.style.display = 'block';
      replyContent.value = '';
    }

    // Initialize interactive features
    initializeLikeDislikeButtons();
    initializeEditDeleteButtons();
    initializeReportButtons();
  }

  // Helper functions remain the same...
  function isOwnerOrModerator(authorId) {
    const currentUser = JSON.parse(localStorage.getItem('user'));
    
    
    if (!currentUser) {
      
      return false;}

    const isOwner = currentUser._id === authorId;
    const isModerator = currentUser.role === 'moderator' || currentUser.role === 'admin';
    const hasPermission = isOwner || isModerator;
    
    
    return hasPermission;}

  

  function getUserRole(author) {
    if (!author) return 'Member';switch(author.role) {
      case 'admin':
        return 'Admin';case 'moderator':
        return 'Moderator';default:
        return 'Member';}
  }

  async function fetchPlayerRank(userId) {
    try {
      const response = await fetch(`/api/user/${userId}/players`, { credentials: 'include' });
      if (!response.ok) {
        logger.error('Error fetching player data:', response.status);
        return null;}
      const players = await response.json();
      if (!players || players.length === 0) {
        return null;}
      const highestRankPlayer = players.reduce((highest, current) => {
        if (!highest) return current;return (current.mmr > highest.mmr) ? current : highest;}, null);
      return highestRankPlayer ? {
        name: highestRankPlayer.name,
        rank: highestRankPlayer.rank,
        mmr: highestRankPlayer.mmr,
        playerId: highestRankPlayer._id
      } : null;} catch (error) {
      logger.error('Error fetching player rank:', error);
      return null;}
  }

  const playerRankCache = new Map();

  /**
   * Handle new topic form submission
   */
  async function handleNewTopicSubmit(event) {
    event.preventDefault();

    const title = document.getElementById('topic-title').value.trim();
    const content = document.getElementById('topic-content').value.trim();
    const form = event.target;
    const categoryId = form.dataset.categoryId;

    if (!title || !content) {
      showError('Please fill in all fields');
      return;}

    try {
      const payload = { title, content };
      if (categoryId) {
        payload.categoryId = categoryId;
      }

      const response = await fetch('/api/forum/topic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        credentials: 'include'
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to create topic');
      }

      hideNewTopicModal();
      showSuccess('Topic created successfully!');
      
      // Refresh and show the new topic
      await loadCategories();
      showTopicView(responseData._id);
    } catch (error) {
      logger.error('Error creating topic:', error);
      showError(`Error creating topic: ${error.message}`);
    }
  }

  /**
   * Handle reply form submission
   */
  async function handleReplySubmit(event) {
    event.preventDefault();

    const content = replyContent.value.trim();

    if (!content) {
      showError('Please enter a reply');
      return;}

    try {
      const response = await fetch('/api/forum/post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          topicId: currentTopicId,
          content
        }),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to post reply');
      }

      showSuccess('Reply posted successfully!');
      
      // Refresh and reload topic
      await loadCategories();
      showTopicView(currentTopicId);
    } catch (error) {
      logger.error('Error posting reply:', error);
      showError(`Error: ${error.message}`);
    }
  }

  /**
   * Show new topic modal
   */
  async function showNewTopicModal(preSelectedCategoryId) {
    newTopicModal.classList.add('active');

    const topicTitleInput = document.getElementById('topic-title');
    const topicContentInput = document.getElementById('topic-content');

    if (topicTitleInput) topicTitleInput.value = '';
    if (topicContentInput) topicContentInput.value = '';

    const form = document.getElementById('new-topic-form');
    if (form) {
      form.dataset.categoryId = preSelectedCategoryId || currentCategoryId || '';
    }

    if (topicTitleInput) topicTitleInput.focus();
  }

  /**
   * Hide new topic modal
   */
  function hideNewTopicModal() {
    newTopicModal.classList.remove('active');
  }

  /**
   * Show categories view
   */
  function showCategoriesView() {
    loadCategories();
  }

  /**
   * Show specific view and hide others
   */
  function showView(viewToShow) {
    const views = [categoriesView, categoryView, topicView];
    views.forEach(view => {
      if (view) {
        view.classList.remove('active');
      }
    });
    if (viewToShow) {
      viewToShow.classList.add('active');
    }
  }
});
