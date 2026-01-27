import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
  TextField,
  IconButton
} from '@mui/material';
import { Delete } from '@mui/icons-material';

const SimpleQuestion = ({ question, index, onUpdate, onRemove, canRemove }) => {
  const [localQuestion, setLocalQuestion] = useState(question);

  const handleChange = (field, value) => {
    const updated = { ...localQuestion, [field]: value };
    setLocalQuestion(updated);
    // Отправляем обновление родителю только когда нужно
    setTimeout(() => onUpdate(index, updated), 0);
  };

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Вопрос {index + 1}</Typography>
          <IconButton onClick={() => onRemove(index)} disabled={!canRemove}>
            <Delete />
          </IconButton>
        </Box>
        
        <TextField
          fullWidth
          label="Текст вопроса"
          value={localQuestion.question_text}
          onChange={(e) => handleChange('question_text', e.target.value)}
          multiline
          rows={2}
          sx={{ mb: 2 }}
        />
        
        <TextField
          fullWidth
          label="Правильный ответ"
          value={localQuestion.correct_answer}
          onChange={(e) => handleChange('correct_answer', e.target.value)}
        />
      </CardContent>
    </Card>
  );
};

export default SimpleQuestion;