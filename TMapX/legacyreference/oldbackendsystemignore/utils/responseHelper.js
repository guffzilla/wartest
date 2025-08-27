/**
 * Centralized Response Helper
 * Standardizes API responses across all endpoints
 */

const { createSuccessResponse, createErrorResponse } = require('../middleware/error-handler');

class ResponseHelper {
  /**
   * Send success response with data
   */
  static success(res, data, message = 'Success', statusCode = 200) {
    return res.status(statusCode).json(createSuccessResponse(data, message));
  }

  /**
   * Send error response
   */
  static error(res, message, statusCode = 500, details = null) {
    return res.status(statusCode).json(createErrorResponse(statusCode, message, details));
  }

  /**
   * Send paginated response
   */
  static paginated(res, data, pagination, message = 'Success') {
    return res.json(createSuccessResponse({
      data,
      pagination
    }, message));
  }

  /**
   * Send not found response
   */
  static notFound(res, message = 'Resource not found') {
    return this.error(res, message, 404);
  }

  /**
   * Send unauthorized response
   */
  static unauthorized(res, message = 'Authentication required') {
    return this.error(res, message, 401);
  }

  /**
   * Send forbidden response
   */
  static forbidden(res, message = 'Insufficient permissions') {
    return this.error(res, message, 403);
  }

  /**
   * Send validation error response
   */
  static validationError(res, message = 'Validation failed', details = null) {
    return this.error(res, message, 400, details);
  }

  /**
   * Send conflict response
   */
  static conflict(res, message = 'Resource already exists') {
    return this.error(res, message, 409);
  }

  /**
   * Send created response
   */
  static created(res, data, message = 'Resource created successfully') {
    return this.success(res, data, message, 201);
  }

  /**
   * Send no content response
   */
  static noContent(res) {
    return res.status(204).send();
  }

  /**
   * Send server error response
   */
  static serverError(res, message = 'Internal server error') {
    return this.error(res, message, 500);
  }

  /**
   * Send bad request response
   */
  static badRequest(res, message = 'Bad request') {
    return this.error(res, message, 400);
  }

  /**
   * Send rate limit response
   */
  static rateLimit(res, message = 'Too many requests') {
    return this.error(res, message, 429);
  }

  /**
   * Send maintenance response
   */
  static maintenance(res, message = 'Service temporarily unavailable') {
    return this.error(res, message, 503);
  }

  /**
   * Send file response
   */
  static file(res, filePath, fileName) {
    return res.download(filePath, fileName);
  }

  /**
   * Send JSON file response
   */
  static jsonFile(res, data, fileName) {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return res.json(data);
  }

  /**
   * Send redirect response
   */
  static redirect(res, url, statusCode = 302) {
    return res.redirect(statusCode, url);
  }

  /**
   * Send HTML response
   */
  static html(res, html, statusCode = 200) {
    res.setHeader('Content-Type', 'text/html');
    return res.status(statusCode).send(html);
  }

  /**
   * Send plain text response
   */
  static text(res, text, statusCode = 200) {
    res.setHeader('Content-Type', 'text/plain');
    return res.status(statusCode).send(text);
  }

  /**
   * Send XML response
   */
  static xml(res, xml, statusCode = 200) {
    res.setHeader('Content-Type', 'application/xml');
    return res.status(statusCode).send(xml);
  }

  /**
   * Send CSV response
   */
  static csv(res, csv, fileName = 'data.csv') {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return res.send(csv);
  }

  /**
   * Send image response
   */
  static image(res, imageBuffer, contentType = 'image/png') {
    res.setHeader('Content-Type', contentType);
    return res.send(imageBuffer);
  }

  /**
   * Send streaming response
   */
  static stream(res, stream, contentType = 'application/octet-stream') {
    res.setHeader('Content-Type', contentType);
    return stream.pipe(res);
  }

  /**
   * Send SSE (Server-Sent Events) response
   */
  static sse(res) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res;
  }

  /**
   * Send WebSocket upgrade response
   */
  static websocket(res, upgrade) {
    return res.upgrade(upgrade);
  }
}

module.exports = ResponseHelper;
