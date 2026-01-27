// CreateGroup.js
import React, { useState } from 'react';
import {
  Container, Typography, Box, Card, TextField, Button,
  Paper, Alert, CircularProgress
} from '@mui/material';
import { ArrowBack, Save } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const CreateGroup = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    subject: '',
    academic_year: '',
    max_students: 30
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.post('/groups/', formData);
      navigate('/groups');
    } catch (err) {
      setError(err.response?.data?.detail || 'Ошибка создания группы');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Button
        startIcon={<ArrowBack />}
        onClick={() => navigate('/groups')}
        sx={{ mb: 3, textTransform: 'none' }}
      >
        Назад к списку групп
      </Button>

      <Typography variant="h4" fontWeight="900" sx={{ mb: 3 }}>
        Создание новой группы
      </Typography>

      <Paper elevation={0} sx={{ p: 4, borderRadius: '20px' }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField
              required
              name="name"
              label="Название группы"
              value={formData.name}
              onChange={handleChange}
              fullWidth
              helperText="Придумайте понятное название для вашей группы"
            />

            <TextField
              name="description"
              label="Описание"
              value={formData.description}
              onChange={handleChange}
              multiline
              rows={4}
              fullWidth
              helperText="Опишите цели и задачи группы"
            />

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                name="subject"
                label="Предмет"
                value={formData.subject}
                onChange={handleChange}
                fullWidth
                helperText="Например: Математика, Физика"
              />

              <TextField
                name="academic_year"
                label="Учебный год"
                value={formData.academic_year}
                onChange={handleChange}
                fullWidth
                helperText="Например: 2024-2025"
              />
            </Box>

            <TextField
              name="max_students"
              label="Максимальное количество участников"
              type="number"
              value={formData.max_students}
              onChange={handleChange}
              fullWidth
              helperText="Оставьте 0 для неограниченного количества"
            />

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
              <Button
                variant="outlined"
                onClick={() => navigate('/groups')}
                disabled={loading}
              >
                Отмена
              </Button>
              <Button
                type="submit"
                variant="contained"
                startIcon={loading ? <CircularProgress size={20} /> : <Save />}
                disabled={loading || !formData.name.trim()}
              >
                {loading ? 'Создание...' : 'Создать группу'}
              </Button>
            </Box>
          </Box>
        </form>
      </Paper>
    </Container>
  );
};

export default CreateGroup;