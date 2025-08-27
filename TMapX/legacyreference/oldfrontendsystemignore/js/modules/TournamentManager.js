/**
 * Tournament Management Module
 * Handles tournament creation, management, and administration
 * Updated for Rust backend compatibility
 */

import { apiClient } from './ApiClient.js';

export class TournamentManager {
  constructor() {
    console.log('🏆 TournamentManager initialized');
  }

  /**
   * Load tournament management interface
   */
  async loadTournamentManagement() {
    console.log('🏆 Loading tournament management...');
    
    return `
      <div class="admin-section">
        <div class="section-header">
          <h2><i class="fas fa-crown"></i> Tournament Management</h2>
          <p>Create and manage tournaments</p>
        </div>
        
        <div class="admin-grid">
          <div class="admin-card">
            <h3>Active Tournaments</h3>
            <div id="active-tournaments">
              <p class="text-muted">Loading tournaments...</p>
            </div>
          </div>
          
          <div class="admin-card">
            <h3>Create Tournament</h3>
            <form id="create-tournament-form">
              <div class="form-group">
                <label>Tournament Name</label>
                <input type="text" class="form-control" name="name" required>
              </div>
              <div class="form-group">
                <label>Game Type</label>
                <select class="form-control" name="gameType" required>
                  <option value="">Select Game Type</option>
                  <option value="wc1">Warcraft 1</option>
                  <option value="wc2">Warcraft 2</option>
                  <option value="wc3">Warcraft 3</option>
                </select>
              </div>
              <button type="submit" class="btn btn-primary">Create Tournament</button>
            </form>
          </div>
        </div>
      </div>
    `;}

  /**
   * Setup tournament management event listeners
   */
  setupEventListeners() {
    console.log('🏆 Setting up tournament event listeners...');
    
    // Create tournament form
    const form = document.getElementById('create-tournament-form');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.createTournament(new FormData(form));
      });
    }
  }

  /**
   * Create a new tournament
   */
  async createTournament(formData) {
    try {
      console.log('🏆 Creating tournament...');
      
      const tournamentData = {
        name: formData.get('name'),
        description: `Tournament created by ${this.api.currentUser?.username || 'Admin'}`,
        type: 'single_elimination',
        gameType: formData.get('gameType'),
        maxParticipants: 32,
        startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week from now
        endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 2 weeks from now
        settings: {
          gameType: formData.get('gameType'),
          matchType: '1v1',
          bestOf: 3
        }
      };
      
      const response = await apiClient.createTournament(tournamentData);

      const result = await response.json();

      if (response.ok) {
        console.log('✅ Tournament created:', result);
        
        if (window.adminUtils) {
          window.adminUtils.showNotification('Tournament created successfully!', 'success');
        }
        
        // Reset form
        const form = document.getElementById('create-tournament-form');
        if (form) {
          form.reset();
        }
        
        // Refresh tournaments list
        await this.loadTournaments();
      } else {
        throw new Error(result.error || 'Failed to create tournament');
      }
      
    } catch (error) {
      console.error('Error creating tournament:', error);
      if (window.adminUtils) {
        window.adminUtils.showNotification('Error creating tournament: ' + error.message, 'error');
      }
    }
  }

  /**
   * Load tournaments list
   */
  async loadTournaments() {
    try {
      console.log('🏆 Loading tournaments...');
      
      const data = await apiClient.getTournaments({
        status: 'active',
        limit: 10
      });
      const tournaments = data.tournaments || [];
      
      const container = document.getElementById('active-tournaments');
      if (container) {
        if (tournaments.length > 0) {
          container.innerHTML = tournaments.map(t => `
            <div class="tournament-item">
              <div class="tournament-header">
                <strong>${t.name}</strong>
                <span class="badge badge-${t.status}">${t.status}</span>
              </div>
              <div class="tournament-details">
                <small>${t.gameType?.toUpperCase() || 'Unknown'} • ${t.maxParticipants || 'Unlimited'} participants</small>
                <small>Starts: ${new Date(t.startDate).toLocaleDateString()}</small>
              </div>
              <div class="tournament-actions">
                <button class="btn btn-sm btn-primary" onclick="window.tournamentManager.viewTournament('${t._id}')">View</button>
                ${t.organizer?.userId === window.currentUser?.id ? 
                  `<button class="btn btn-sm btn-secondary" onclick="window.tournamentManager.editTournament('${t._id}')">Edit</button>` : 
                  ''
                }
              </div>
            </div>
          `).join('');
        } else {
          container.innerHTML = '<p class="text-muted">No active tournaments</p>';
        }
      }
      
    } catch (error) {
      console.error('Error loading tournaments:', error);
      const container = document.getElementById('active-tournaments');
      if (container) {
        container.innerHTML = '<p class="text-danger">Failed to load tournaments</p>';
      }
    }
  }

  /**
   * View tournament details
   */
  async viewTournament(tournamentId) {
    try {
      const tournament = await apiClient.getTournament(tournamentId);
      
      // Create tournament details modal
      const modal = document.createElement('div');
      modal.className = 'tournament-details-modal';
      modal.innerHTML = `
        <div class="tournament-details-content">
          <div class="tournament-details-header">
            <h3>${tournament.name}</h3>
            <button class="close-btn" onclick="this.closest('.tournament-details-modal').remove()">&times;</button>
          </div>
          <div class="tournament-details-body">
            <div class="tournament-info">
              <p><strong>Status:</strong> <span class="badge badge-${tournament.status}">${tournament.status}</span></p>
              <p><strong>Game Type:</strong> ${tournament.gameType?.toUpperCase() || 'Unknown'}</p>
              <p><strong>Participants:</strong> ${tournament.participants?.length || 0}/${tournament.maxParticipants || 'Unlimited'}</p>
              <p><strong>Start Date:</strong> ${new Date(tournament.startDate).toLocaleDateString()}</p>
              <p><strong>End Date:</strong> ${new Date(tournament.endDate).toLocaleDateString()}</p>
              <p><strong>Organizer:</strong> ${tournament.organizer?.username || 'Unknown'}</p>
            </div>
            <div class="tournament-description">
              <h4>Description</h4>
              <p>${tournament.description || 'No description available.'}</p>
            </div>
          </div>
          <div class="tournament-details-footer">
            <button class="btn btn-secondary" onclick="this.closest('.tournament-details-modal').remove()">Close</button>
            ${tournament.status === 'upcoming' && tournament.participants?.length < (tournament.maxParticipants || 999) ?
              `<button class="btn btn-primary" onclick="window.tournamentManager.joinTournament('${tournament._id}')">Join Tournament</button>` :
              ''
            }
          </div>
        </div>
      `;

      // Add styles
      const style = document.createElement('style');
      style.textContent = `
        .tournament-details-modal {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
        }
        
        .tournament-details-content {
          background: #1a1a1a;
          border: 2px solid #4a4a4a;
          border-radius: 8px;
          width: 90%;
          max-width: 600px;
          max-height: 90vh;
          overflow-y: auto;
          color: #fff;
        }
        
        .tournament-details-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-bottom: 1px solid #4a4a4a;
        }
        
        .tournament-details-header h3 {
          margin: 0;
          color: #ffd700;
        }
        
        .close-btn {
          background: none;
          border: none;
          color: #fff;
          font-size: 24px;
          cursor: pointer;
          padding: 0;
          width: 30px;
          height: 30px;
        }
        
        .tournament-details-body {
          padding: 20px;
        }
        
        .tournament-info p {
          margin-bottom: 10px;
        }
        
        .tournament-description {
          margin-top: 20px;
        }
        
        .tournament-description h4 {
          color: #ffd700;
          margin-bottom: 10px;
        }
        
        .tournament-details-footer {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          padding: 20px;
          border-top: 1px solid #4a4a4a;
        }
        
        .btn {
          padding: 10px 20px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: bold;
        }
        
        .btn-primary {
          background: #007bff;
          color: white;
        }
        
        .btn-secondary {
          background: #6c757d;
          color: white;
        }
      `;

      document.head.appendChild(style);
      document.body.appendChild(modal);
      
    } catch (error) {
      console.error('Error viewing tournament:', error);
      if (window.adminUtils) {
        window.adminUtils.showNotification('Error loading tournament: ' + error.message, 'error');
      }
    }
  }

  /**
   * Join a tournament
   */
  async joinTournament(tournamentId) {
    try {
      const result = await apiClient.joinTournament(tournamentId, {
        player_name: window.currentUser?.username || 'Player'
      });
        if (window.adminUtils) {
          window.adminUtils.showNotification('Successfully joined tournament!', 'success');
        }
        // Close modal and refresh
        document.querySelector('.tournament-details-modal')?.remove();
        await this.loadTournaments();
      } else {
        throw new Error(result.error || 'Failed to join tournament');
      }
    } catch (error) {
      console.error('Error joining tournament:', error);
      if (window.adminUtils) {
        window.adminUtils.showNotification('Error joining tournament: ' + error.message, 'error');
      }
    }
  }
}

export default TournamentManager;
