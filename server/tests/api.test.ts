import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createServer } from '../index';

let app: any;

beforeAll(() => {
  app = createServer();
});

describe('API Тестирование системы «Качество в СибГИУ»', () => {

  describe('GET /api/health', () => {
    it('возвращает статус 200', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
    });

    it('возвращает поле status OK', async () => {
      const res = await request(app).get('/api/health');
      expect(res.body.status).toBe('OK');
    });

    it('возвращает поле timestamp', async () => {
      const res = await request(app).get('/api/health');
      expect(res.body).toHaveProperty('timestamp');
    });

    it('возвращает поле message', async () => {
      const res = await request(app).get('/api/health');
      expect(res.body).toHaveProperty('message');
    });

    it('message содержит текст "Server is running"', async () => {
      const res = await request(app).get('/api/health');
      expect(res.body.message).toContain('Server is running');
    });
  });

  describe('GET /api/questionnaires', () => {
    it('эндпоинт существует (не 404)', async () => {
      const res = await request(app).get('/api/questionnaires');
      expect(res.status).not.toBe(404);
    });

    it('без авторизации возвращает 401', async () => {
      const res = await request(app).get('/api/questionnaires');
      expect(res.status).toBe(401);
    });

    it('возвращает JSON', async () => {
      const res = await request(app).get('/api/questionnaires');
      expect(res.headers['content-type']).toContain('application/json');
    });

    it('ответ содержит поле success', async () => {
      const res = await request(app).get('/api/questionnaires');
      expect(res.body).toHaveProperty('success');
    });

    it('поле success = false без авторизации', async () => {
      const res = await request(app).get('/api/questionnaires');
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/surveys/home', () => {
    it('эндпоинт существует (не 404)', async () => {
      const res = await request(app).get('/api/surveys/home');
      expect(res.status).not.toBe(404);
    });

    it('без авторизации возвращает 401', async () => {
      const res = await request(app).get('/api/surveys/home');
      expect(res.status).toBe(401);
    });

    it('возвращает JSON', async () => {
      const res = await request(app).get('/api/surveys/home');
      expect(res.headers['content-type']).toContain('application/json');
    });

    it('ответ содержит поле success', async () => {
      const res = await request(app).get('/api/surveys/home');
      expect(res.body).toHaveProperty('success');
    });

    it('поле success = false без авторизации', async () => {
      const res = await request(app).get('/api/surveys/home');
      expect(res.body.success).toBe(false);
    });
  });
});