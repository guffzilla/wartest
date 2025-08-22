#!/usr/bin/env python3
"""
Network Analyzer for W3Champions
Monitors and analyzes network communication patterns of the W3Champions application.
"""

import pyshark
import json
import time
import threading
import requests
from datetime import datetime
from pathlib import Path
import argparse
import sys

class W3ChampionsNetworkAnalyzer:
    def __init__(self, interface=None, output_file="network_analysis.json"):
        self.interface = interface
        self.output_file = output_file
        self.captured_packets = []
        self.analysis_results = {
            'api_endpoints': set(),
            'data_formats': set(),
            'communication_patterns': [],
            'timestamps': [],
            'packet_count': 0
        }
        
    def start_capture(self, duration=300):
        """Start packet capture for specified duration."""
        print(f"Starting network capture for {duration} seconds...")
        
        try:
            # Initialize capture
            if self.interface:
                capture = pyshark.LiveCapture(interface=self.interface)
            else:
                capture = pyshark.LiveCapture()
            
            # Set display filter for W3Champions traffic
            capture.set_debug()
            
            # Start capture in separate thread
            capture_thread = threading.Thread(
                target=self._capture_packets, 
                args=(capture, duration)
            )
            capture_thread.start()
            
            # Wait for completion
            capture_thread.join()
            
        except Exception as e:
            print(f"Error during capture: {e}")
    
    def _capture_packets(self, capture, duration):
        """Capture packets for the specified duration."""
        start_time = time.time()
        
        try:
            for packet in capture.sniff_continuously():
                if time.time() - start_time > duration:
                    break
                    
                self._analyze_packet(packet)
                
        except KeyboardInterrupt:
            print("Capture interrupted by user")
        except Exception as e:
            print(f"Error in packet capture: {e}")
        finally:
            capture.close()
    
    def _analyze_packet(self, packet):
        """Analyze individual packet for W3Champions patterns."""
        try:
            packet_info = {
                'timestamp': datetime.now().isoformat(),
                'protocol': None,
                'source': None,
                'destination': None,
                'length': 0,
                'data': None
            }
            
            # Extract basic packet information
            if hasattr(packet, 'length'):
                packet_info['length'] = int(packet.length)
            
            # Analyze HTTP traffic
            if hasattr(packet, 'http'):
                packet_info['protocol'] = 'HTTP'
                if hasattr(packet.http, 'request_uri'):
                    packet_info['data'] = packet.http.request_uri
                    self._analyze_http_request(packet.http)
                elif hasattr(packet.http, 'response_code'):
                    packet_info['data'] = f"Response: {packet.http.response_code}"
                    self._analyze_http_response(packet.http)
            
            # Analyze HTTPS traffic
            elif hasattr(packet, 'ssl') or hasattr(packet, 'tls'):
                packet_info['protocol'] = 'HTTPS'
                self._analyze_ssl_traffic(packet)
            
            # Analyze WebSocket traffic
            elif hasattr(packet, 'websocket'):
                packet_info['protocol'] = 'WebSocket'
                self._analyze_websocket_traffic(packet.websocket)
            
            # Extract IP information
            if hasattr(packet, 'ip'):
                packet_info['source'] = packet.ip.src
                packet_info['destination'] = packet.ip.dst
            elif hasattr(packet, 'ipv6'):
                packet_info['source'] = packet.ipv6.src
                packet_info['destination'] = packet.ipv6.dst
            
            # Check for W3Champions-related traffic
            if self._is_w3champions_traffic(packet_info):
                self.captured_packets.append(packet_info)
                self.analysis_results['packet_count'] += 1
                self.analysis_results['timestamps'].append(packet_info['timestamp'])
                
        except Exception as e:
            print(f"Error analyzing packet: {e}")
    
    def _is_w3champions_traffic(self, packet_info):
        """Check if packet is related to W3Champions."""
        w3c_indicators = [
            'w3champions.com',
            'w3c',
            'champion',
            'warcraft',
            'battle.net',
            'blizzard'
        ]
        
        if packet_info['data']:
            data_lower = packet_info['data'].lower()
            return any(indicator in data_lower for indicator in w3c_indicators)
        
        return False
    
    def _analyze_http_request(self, http_layer):
        """Analyze HTTP request patterns."""
        if hasattr(http_layer, 'request_uri'):
            uri = http_layer.request_uri
            self.analysis_results['api_endpoints'].add(uri)
            
            # Analyze request method
            if hasattr(http_layer, 'request_method'):
                method = http_layer.request_method
                self.analysis_results['communication_patterns'].append({
                    'type': 'HTTP_REQUEST',
                    'method': method,
                    'uri': uri,
                    'timestamp': datetime.now().isoformat()
                })
    
    def _analyze_http_response(self, http_layer):
        """Analyze HTTP response patterns."""
        if hasattr(http_layer, 'response_code'):
            code = http_layer.response_code
            self.analysis_results['communication_patterns'].append({
                'type': 'HTTP_RESPONSE',
                'code': code,
                'timestamp': datetime.now().isoformat()
            })
    
    def _analyze_ssl_traffic(self, packet):
        """Analyze SSL/TLS traffic patterns."""
        # Extract server name if available
        if hasattr(packet, 'ssl') and hasattr(packet.ssl, 'handshake_extensions_server_name'):
            server_name = packet.ssl.handshake_extensions_server_name
            if 'w3champions' in server_name.lower():
                self.analysis_results['communication_patterns'].append({
                    'type': 'SSL_CONNECTION',
                    'server': server_name,
                    'timestamp': datetime.now().isoformat()
                })
    
    def _analyze_websocket_traffic(self, ws_layer):
        """Analyze WebSocket traffic patterns."""
        if hasattr(ws_layer, 'payload'):
            payload = ws_layer.payload
            self.analysis_results['communication_patterns'].append({
                'type': 'WEBSOCKET_DATA',
                'payload_length': len(payload),
                'timestamp': datetime.now().isoformat()
            })
    
    def analyze_api_endpoints(self):
        """Analyze discovered API endpoints."""
        print("\n=== API Endpoints Analysis ===")
        for endpoint in self.analysis_results['api_endpoints']:
            print(f"Endpoint: {endpoint}")
            
            # Try to determine endpoint purpose
            if 'match' in endpoint.lower():
                print("  Purpose: Matchmaking")
            elif 'ladder' in endpoint.lower():
                print("  Purpose: Ladder rankings")
            elif 'player' in endpoint.lower():
                print("  Purpose: Player data")
            elif 'game' in endpoint.lower():
                print("  Purpose: Game data")
            else:
                print("  Purpose: Unknown")
    
    def analyze_communication_patterns(self):
        """Analyze communication patterns."""
        print("\n=== Communication Patterns ===")
        
        pattern_counts = {}
        for pattern in self.analysis_results['communication_patterns']:
            pattern_type = pattern['type']
            pattern_counts[pattern_type] = pattern_counts.get(pattern_type, 0) + 1
        
        for pattern_type, count in pattern_counts.items():
            print(f"{pattern_type}: {count} occurrences")
    
    def generate_report(self):
        """Generate comprehensive analysis report."""
        report = {
            'analysis_timestamp': datetime.now().isoformat(),
            'capture_summary': {
                'total_packets': self.analysis_results['packet_count'],
                'capture_duration': len(self.analysis_results['timestamps']),
                'unique_endpoints': len(self.analysis_results['api_endpoints'])
            },
            'api_endpoints': list(self.analysis_results['api_endpoints']),
            'communication_patterns': self.analysis_results['communication_patterns'],
            'packet_samples': self.captured_packets[:10]  # First 10 packets as samples
        }
        
        # Save report
        with open(self.output_file, 'w') as f:
            json.dump(report, f, indent=2)
        
        print(f"\nAnalysis report saved to: {self.output_file}")
        return report
    
    def test_api_endpoints(self):
        """Test discovered API endpoints."""
        print("\n=== API Endpoint Testing ===")
        
        for endpoint in self.analysis_results['api_endpoints']:
            if endpoint.startswith('/'):
                # Construct full URL
                url = f"https://ingame-addon.w3champions.com{endpoint}"
                print(f"Testing: {url}")
                
                try:
                    response = requests.get(url, timeout=5)
                    print(f"  Status: {response.status_code}")
                    print(f"  Content-Type: {response.headers.get('content-type', 'Unknown')}")
                except Exception as e:
                    print(f"  Error: {e}")

def main():
    parser = argparse.ArgumentParser(description='W3Champions Network Analyzer')
    parser.add_argument('--interface', '-i', help='Network interface to capture from')
    parser.add_argument('--duration', '-d', type=int, default=300, help='Capture duration in seconds')
    parser.add_argument('--output', '-o', default='w3c_network_analysis.json', help='Output file name')
    parser.add_argument('--test-apis', action='store_true', help='Test discovered API endpoints')
    
    args = parser.parse_args()
    
    analyzer = W3ChampionsNetworkAnalyzer(
        interface=args.interface,
        output_file=args.output
    )
    
    print("W3Champions Network Analyzer")
    print("=" * 40)
    print(f"Interface: {args.interface or 'Default'}")
    print(f"Duration: {args.duration} seconds")
    print(f"Output: {args.output}")
    
    # Start capture
    analyzer.start_capture(args.duration)
    
    # Analyze results
    analyzer.analyze_api_endpoints()
    analyzer.analyze_communication_patterns()
    
    # Generate report
    report = analyzer.generate_report()
    
    # Test APIs if requested
    if args.test_apis:
        analyzer.test_api_endpoints()
    
    print("\nAnalysis complete!")

if __name__ == "__main__":
    main()
