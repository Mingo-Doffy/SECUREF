import React, { useState, useEffect, useRef } from 'react';
import { Radar } from 'react-chartjs-2';
import { 
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Legend,
  Tooltip
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import {
  Container,
  Button,
  Card,
  CardHeader,
  CardContent,
  Alert,
  Chip,
  LinearProgress,
  Tooltip as MuiTooltip,
  Typography,
  Box,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  Divider,
  Popover,
  IconButton
} from '@mui/material';
import {
  CheckCircle,
  Warning,
  ExpandMore as ExpandMoreIcon,
  Download,
  HelpOutline as HelpIcon,
} from '@mui/icons-material';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import questionsData from './data/questions.json';
import './App.css';

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Legend,
  Tooltip,
  ChartDataLabels
);

const App = () => {
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const [progressValue, setProgressValue] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const radarRef = useRef(null);
  const [helpAnchorEl, setHelpAnchorEl] = useState(null);

  const handleHelpClick = (event) => {
    setHelpAnchorEl(event.currentTarget);
  };

  const handleHelpClose = () => {
    setHelpAnchorEl(null);
  };

  const helpOpen = Boolean(helpAnchorEl);

  useEffect(() => {
    setQuestions(questionsData);
  }, []);

  useEffect(() => {
    const savedAnswers = localStorage.getItem('cybersecurityAnswers');
    if (savedAnswers) {
      setAnswers(JSON.parse(savedAnswers));
    }
  }, []);

  useEffect(() => {
    if (Object.keys(answers).length > 0) {
      localStorage.setItem('cybersecurityAnswers', JSON.stringify(answers));
      calculateResults();
    }
  }, [answers]);

  const calculateResults = () => {
    const scores = {};
    const suggestions = {};
    let totalScore = 0;
    let totalQuestionsAnswered = 0;

    questions.forEach((category) => {
      let categoryScore = 0;
      let categoryQuestions = 0;
      const categorySuggestions = new Set();

      category.questions.forEach((question) => {
        if (answers[question.id]) {
          const answerValue = question.points[answers[question.id]] || 0;
          const answerWeight = (answerValue / 10) * 100;
          categoryScore += answerWeight;
          categoryQuestions += 1;
          totalScore += answerWeight;
          totalQuestionsAnswered += 1;

          if (question.suggestion && question.suggestion[answers[question.id]]) {
            categorySuggestions.add(question.suggestion[answers[question.id]]);
          }
        }
      });

      if (categoryQuestions > 0) {
        const score = (categoryScore / categoryQuestions);
        scores[category.id] = score;
        
        const generalSuggestions = [];
        if (score < 40) {
          generalSuggestions.push("Mettre en place une politique de cybersécurité urgente pour cette catégorie.");
        } else if (score < 60) {
          generalSuggestions.push("Revoir les procédures existantes pour cette catégorie.");
        } else if (score < 80) {
          generalSuggestions.push("Optimiser les mesures actuelles pour cette catégorie.");
        } else {
          generalSuggestions.push("Maintenir les bonnes pratiques pour cette catégorie.");
        }

        suggestions[category.id] = [...Array.from(categorySuggestions), ...generalSuggestions];
        if (suggestions[category.id].length === 0) {
          suggestions[category.id].push("Aucune suggestion spécifique disponible.");
        }
      } else {
        scores[category.id] = 0;
        suggestions[category.id] = ["Répondez aux questions pour obtenir des suggestions."];
      }
    });

    const globalScore = totalQuestionsAnswered > 0 ? (totalScore / totalQuestionsAnswered) : 0;

    setResults({
      globalScore,
      scores,
      suggestions,
    });
  };

  useEffect(() => {
    const allQuestionIds = questions.flatMap((cat) => cat.questions.map((q) => q.id));
    const answeredCount = Object.keys(answers).length;
    const totalQuestions = allQuestionIds.length;
    const targetProgress = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;

    let startValue = progressValue;
    const duration = 600;
    const startTime = performance.now();

    const animateProgress = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const newValue = startValue + (targetProgress - startValue) * progress;
      setProgressValue(newValue);

      if (progress < 1) {
        requestAnimationFrame(animateProgress);
      }
    };

    requestAnimationFrame(animateProgress);
  }, [answers, questions]);

  const handleAnswer = (questionId, value) => {
    setAnswers({ ...answers, [questionId]: value });
    setError('');
  };

  const handleReset = () => {
    setAnswers({});
    setResults(null);
    setError("");
    setProgressValue(0);
    setSelectedCategory(null);
    localStorage.removeItem("cybersecurityAnswers");
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text("Évaluation de conformité cybersécurité", 20, 20);
    doc.setFontSize(10);
    doc.text(`Score global : ${results.globalScore.toFixed(1)}%`, 20, 30);

    html2canvas(radarRef.current, { scale: 3, backgroundColor: "#f8f9fa" }).then((canvas) => {
      const imgData = canvas.toDataURL("image/png");
      doc.addImage(imgData, "PNG", 40, 40, 130, 130);
      doc.text("Radar des Scores", 105, 180, { align: "center" });

      doc.setFontSize(12);
      doc.text("Scores par catégorie :", 20, 200);
      let y = 210;
      Object.keys(results.scores).forEach((categoryId) => {
        const categoryName = questions.find((cat) => cat.id === categoryId)?.name;
        const score = results.scores[categoryId];
        doc.setFontSize(10);
        doc.text(
          `${categoryName.padEnd(30)} : ${score.toFixed(1)}% ${score < 40 ? "[Critique]" : score >= 80 ? "[Optimal]" : ""}`,
          20,
          y
        );
        y += 8;
      });

      doc.addPage();
      doc.setFontSize(12);
      doc.text("Suggestions :", 20, 20);
      y = 30;
      Object.keys(results.suggestions).forEach((categoryId) => {
        const categoryName = questions.find((cat) => cat.id === categoryId)?.name;
        doc.setFontSize(10);
        doc.text(categoryName, 20, y);
        y += 8;
        const suggestionsList = results.suggestions[categoryId].slice(0, 5);
        suggestionsList.forEach((suggestion) => {
          doc.text(`- ${suggestion}`, 30, y);
          y += 8;
        });
        y += 3;
      });

      doc.save("securef.pdf");
    });
  };

  const getScoreColor = (score) => {
    if (score < 40) return "#ef4444";
    if (score < 60) return "#f97316";
    if (score < 80) return "#eab308";
    return "#22c55e";
  };

  const getRadarData = () => {
    if (!results) return null;

    const scores = Object.values(results.scores);
    const labels = questions.map((cat) => cat.name);

    const ctx = document.createElement("canvas").getContext("2d");
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, "rgba(59, 130, 246, 0.4)");
    gradient.addColorStop(1, "rgba(59, 130, 246, 0.1)");

    return {
      labels,
      datasets: [{
        label: "Score de conformité (%)",
        data: scores,
        backgroundColor: gradient,
        borderColor: "#3b82f6",
        borderWidth: 2,
        pointBackgroundColor: (ctx) => getScoreColor(ctx.dataset.data[ctx.dataIndex]),
        pointRadius: selectedCategory !== null ? 
          scores.map((_, i) => i === selectedCategory ? 7 : 4) : 5,
        pointHoverRadius: 7,
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
      }]
    };
  };

  const getRadarOptions = () => ({
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        min: 0,
        max: 100,
        angleLines: {
          display: true,
          color: "rgba(0, 0, 0, 0.7)"
        },
        grid: {
          circular: true,
          color: "rgba(0, 0, 0, 0.7)"
        },
        ticks: {
          stepSize: 20,
          backdropColor: "rgba(200, 200, 200, 0.3)",
          color: "#fff",
          showLabelBackdrop: false,
          z: 1
        },
        pointLabels: {
          color: (ctx) => selectedCategory === ctx.index ? "#3b82f6" : "#666",
          font: {
            size: window.innerWidth < 600 ? 8 : 12,
            weight: (ctx) => selectedCategory === ctx.index ? "bold" : "normal"
          }
        }
      }
    },
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: ${ctx.raw.toFixed(1)}%`
        }
      },
      datalabels: {
        display: false
      }
    },
    onHover: (event, elements) => {
      const chart = event.chart;
      chart.canvas.style.cursor = elements[0] ? "pointer" : "default";
    },
    onClick: (event, elements) => {
      if (elements[0]) {
        setSelectedCategory(elements[0].index);
      }
    }
  });

  const allQuestionIds = questions.flatMap((cat) => cat.questions.map((q) => q.id));
  const answeredCount = Object.keys(answers).length;
  const totalQuestions = allQuestionIds.length;

  return (
    <Container maxWidth="xl" sx={{ my: 4, mt: 10 }}>
      <Typography variant="h4" align="center" gutterBottom sx={{ 
        color: '#2c3e50', 
        fontWeight: 'bold',
        fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' }
      }}>
        Évaluation de conformité cybersécurité
      </Typography>

      <Box
        sx={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1100,
          bgcolor: "background.paper",
          boxShadow: 1,
          p: 1,
        }}
      >
        <Container maxWidth="xl">
          <LinearProgress
            variant="determinate"
            value={progressValue}
            sx={{ 
              height: 10, 
              borderRadius: 5,
              '& .MuiLinearProgress-bar': {
                backgroundColor: '#3b82f6'
              }
            }}
          />
          <Typography variant="body2" align="center" sx={{ 
            mt: 0.5, 
            color: 'text.secondary',
            fontSize: { xs: '0.75rem', sm: '0.875rem' }
          }}>
            {answeredCount}/{totalQuestions} questions répondues ({Math.round(progressValue)}%)
          </Typography>
        </Container>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Colonne des questions */}
        <Grid item xs={12} md={6} sx={{ order: { xs: 1, md: 0 } }}>
          {questions.map((category) => (
            <Card 
              key={category.id} 
              sx={{ 
                mb: 3, 
                boxShadow: 2,
                borderLeft: selectedCategory === questions.findIndex(c => c.id === category.id) ? 
                  '4px solid #3b82f6' : 'none'
              }}
            >
              <CardHeader 
                title={category.name} 
                sx={{ 
                  bgcolor: '#f8f9fa',
                  borderBottom: '1px solid #eee',
                  py: { xs: 1, md: 2 },
                  '& .MuiCardHeader-title': { 
                    fontSize: { xs: '1rem', md: '1.25rem' } 
                  }
                }} 
              />
              <CardContent sx={{ px: { xs: 1, md: 2 }, py: { xs: 1, md: 2 } }}>
                {category.questions.map((question) => (
                  <Box key={question.id} sx={{ mb: 3 }}>
                    <MuiTooltip title={question.explanation} placement="top" arrow>
                      <Typography
                        variant="body1"
                        sx={{ 
                          fontWeight: 500,
                          mb: 1,
                          color: 'text.primary',
                          fontSize: { xs: '0.875rem', md: '1rem' }
                        }}
                      >
                        {question.text}
                      </Typography>
                    </MuiTooltip>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {question.options.map((option) => (
                        <Button
                          key={option}
                          variant={answers[question.id] === option ? "contained" : "outlined"}
                          color="primary"
                          onClick={() => handleAnswer(question.id, option)}
                          sx={{
                            textTransform: 'none',
                            borderRadius: 2,
                            fontSize: { xs: '0.75rem', sm: '0.875rem' },
                            px: { xs: 1, sm: 2 },
                            py: { xs: 0.5, sm: 1 },
                            minWidth: { xs: '80px', sm: '100px' }
                          }}
                        >
                          {option}
                        </Button>
                      ))}
                    </Box>
                  </Box>
                ))}
              </CardContent>
            </Card>
          ))}

          <Box sx={{ display: 'flex', gap: 2, my: 3 }}>
            <Button
              variant="outlined"
              color="secondary"
              size="large"
              onClick={handleReset}
              sx={{ 
                flex: 1,
                borderRadius: 2,
                py: 1.5,
                fontSize: { xs: '0.875rem', md: '1rem' }
              }}
            >
              Réinitialiser
            </Button>
          </Box>
        </Grid>

        {/* Colonne des résultats */}
        <Grid item xs={12} md={6} sx={{ 
          minHeight: { xs: '320px', sm: '400px' },
          order: { xs: -1, md: 0 }
        }}>
          {answeredCount > 0 && (
            <Card sx={{ 
              boxShadow: 3, 
              mb: 4,
              position: { md: 'sticky' },
              top: { md: 80 }
            }}>
              <CardHeader 
                title={<Typography variant="h6">Résultats</Typography>}
                sx={{ 
                  bgcolor: '#f8f9fa',
                  borderBottom: '1px solid #eee',
                  py: { xs: 1, md: 2 },
                  '& .MuiCardHeader-title': { 
                    fontSize: { xs: '1rem', md: '1.25rem' } 
                  }
                }} 
              />
              
              <CardContent sx={{ px: { xs: 1, md: 3 }, py: { xs: 1, md: 2 } }}>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Box sx={{ 
                      p: { xs: 1, md: 2 }, 
                      textAlign: 'center',
                      mb: { xs: 1, md: 2 }
                    }}>
                      <Typography variant="body1" sx={{ 
                        fontSize: { xs: '0.875rem', md: '1rem' },
                        mb: { xs: 0.5, md: 1 }
                      }}>
                        Score Global
                      </Typography>
                      <Chip
                        label={`${results?.globalScore?.toFixed(1) || 0}%`}
                        sx={{
                          bgcolor: getScoreColor(results?.globalScore || 0),
                          color: "#fff",
                          fontSize: { xs: '0.875rem', md: '1.2rem' },
                          height: 'auto',
                          px: { xs: 1, md: 2 },
                          py: { xs: 0.5, md: 1 }
                        }}
                        icon={
                          results?.globalScore >= 80 ? (
                            <CheckCircle sx={{ color: "#fff !important", ml: 1 }} />
                          ) : results?.globalScore < 40 ? (
                            <Warning sx={{ color: "#fff !important", ml: 1 }} />
                          ) : null
                        }
                      />
                      <Typography variant="body2" sx={{ 
                        mt: { xs: 1, md: 2 }, 
                        color: 'text.secondary',
                        fontSize: { xs: '0.75rem', md: '0.875rem' }
                      }}>
                        {!results ? 'Répondez aux questions pour voir les résultats' : 
                         results.globalScore < 40 ? 'Niveau Critique' : 
                         results.globalScore < 60 ? 'Niveau Faible' : 
                         results.globalScore < 80 ? 'Niveau Moyen' : 'Niveau Optimal'}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12}>
                    <Box sx={{ 
                      height: { xs: '250px', sm: '300px' },
                      minHeight: '250px',
                      position: 'relative',
                      mx: { xs: -2, md: 0 }
                    }} ref={radarRef}>
                      {results ? (
                        <Radar
                          data={getRadarData()}
                          options={getRadarOptions()}
                        />
                      ) : (
                        <Box sx={{ 
                          height: '100%', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          color: 'text.secondary',
                          px: 2,
                          textAlign: 'center'
                        }}>
                          <Typography variant="body2">
                            Répondez aux questions pour voir les résultats
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Grid>
                </Grid>

                {results && (
                  <>
                    <Divider sx={{ my: { xs: 1, md: 3 } }} />
                    <Typography variant="subtitle1" sx={{ 
                      mb: 1,
                      fontSize: { xs: '0.875rem', md: '1rem' }
                    }}>
                      Détails par catégorie
                    </Typography>
                    <TableContainer component={Paper} sx={{ 
                      mb: 2,
                      maxHeight: { xs: '200px', md: 'none' },
                      overflow: 'auto'
                    }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ bgcolor: '#f8f9fa' }}>
                            <TableCell sx={{ 
                              fontWeight: 'bold',
                              py: { xs: 0.5, md: 1 },
                              fontSize: { xs: '0.75rem', md: '0.875rem' }
                            }}>Catégorie</TableCell>
                            <TableCell align="right" sx={{ 
                              fontWeight: 'bold',
                              py: { xs: 0.5, md: 1 },
                              fontSize: { xs: '0.75rem', md: '0.875rem' }
                            }}>Score</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {Object.keys(results.scores).map((categoryId, index) => {
                            const score = results.scores[categoryId];
                            return (
                              <TableRow 
                                key={categoryId}
                                hover
                                onClick={() => setSelectedCategory(index)}
                                sx={{ 
                                  cursor: 'pointer',
                                  bgcolor: selectedCategory === index ? '#f0f7ff' : 'inherit'
                                }}
                              >
                                <TableCell sx={{ 
                                  py: { xs: 0.5, md: 1 },
                                  fontSize: { xs: '0.75rem', md: '0.875rem' }
                                }}>
                                  {questions.find((cat) => cat.id === categoryId)?.name}
                                </TableCell>
                                <TableCell align="right" sx={{ 
                                  py: { xs: 0.5, md: 1 },
                                  fontSize: { xs: '0.75rem', md: '0.875rem' }
                                }}>
                                  <Typography sx={{ 
                                    color: getScoreColor(score),
                                    fontWeight: 'medium'
                                  }}>
                                    {score.toFixed(1)}%
                                  </Typography>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>

                    <Typography variant="subtitle1" sx={{ 
                      mb: 1,
                      fontSize: { xs: '0.875rem', md: '1rem' }
                    }}>
                      Recommandations
                    </Typography>
                    {Object.keys(results.scores).map((categoryId, index) => {
                      const score = results.scores[categoryId];
                      const categoryName = questions.find((cat) => cat.id === categoryId)?.name;
                      
                      return (
                        <Accordion 
                          key={categoryId} 
                          defaultExpanded={score < 70}
                          sx={{ 
                            mb: 1,
                            borderLeft: selectedCategory === index ? 
                              '4px solid #3b82f6' : 'none'
                          }}
                        >
                          <AccordionSummary 
                            expandIcon={<ExpandMoreIcon />}
                            sx={{ minHeight: { xs: '48px', md: '64px' } }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Typography sx={{ 
                                fontWeight: 'medium',
                                fontSize: { xs: '0.875rem', md: '1rem' }
                              }}>
                                {categoryName}
                              </Typography>
                              <Chip
                                label={`${score.toFixed(1)}%`}
                                size="small"
                                sx={{ 
                                  ml: 2,
                                  bgcolor: getScoreColor(score),
                                  color: '#fff',
                                  fontSize: { xs: '0.75rem', md: '0.875rem' }
                                }}
                              />
                            </Box>
                          </AccordionSummary>
                          <AccordionDetails sx={{ py: { xs: 1, md: 2 } }}>
                            <List dense>
                              {results.suggestions[categoryId].map((suggestion, i) => (
                                <ListItem key={i} sx={{ py: 0.5 }}>
                                  <ListItemText 
                                    primary={`• ${suggestion}`} 
                                    primaryTypographyProps={{ 
                                      variant: 'body2',
                                      fontSize: { xs: '0.75rem', md: '0.875rem' }
                                    }}
                                  />
                                </ListItem>
                              ))}
                            </List>
                          </AccordionDetails>
                        </Accordion>
                      );
                    })}

                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                      <Button
                        variant="contained"
                        startIcon={<Download />}
                        onClick={handleExportPDF}
                        disabled={!results}
                        sx={{
                          borderRadius: 2,
                          px: 4,
                          py: 1.5,
                          fontWeight: 'bold',
                          fontSize: { xs: '0.875rem', md: '1rem' }
                        }}
                      >
                        Exporter le rapport
                      </Button>
                    </Box>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>

      {/* Bouton d'aide ergonomique */}
      <Box
        sx={{
          position: 'fixed',
          bottom: 32,
          right: 32,
          zIndex: 1000,
        }}
      >
        <IconButton
          color="primary"
          onClick={handleHelpClick}
          sx={{
            backgroundColor: 'primary.main',
            color: 'white',
            '&:hover': {
              backgroundColor: 'primary.dark',
              transform: 'scale(1.1)',
            },
            transition: 'all 0.3s ease',
            boxShadow: 3,
            width: 56,
            height: 56,
          }}
        >
          <HelpIcon fontSize="medium" />
        </IconButton>
      </Box>

      {/* Popover d'aide */}
      <Popover
        open={helpOpen}
        anchorEl={helpAnchorEl}
        onClose={handleHelpClose}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        sx={{
          '& .MuiPaper-root': {
            borderRadius: 2,
            padding: 2,
            maxWidth: 350,
          }
        }}
      >
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
          Aide et instructions
        </Typography>
        <List dense>
          <ListItem sx={{ py: 0.5 }}>
            <ListItemText 
              primary="1. Répondez à toutes les questions" 
              secondary="Cliquez sur les options pour sélectionner vos réponses"
              primaryTypographyProps={{ fontSize: '0.875rem' }}
              secondaryTypographyProps={{ fontSize: '0.75rem' }}
            />
          </ListItem>
          <Divider component="li" />
          <ListItem sx={{ py: 0.5 }}>
            <ListItemText 
              primary="2. Visualisez vos résultats" 
              secondary="Le radar et les scores se mettent à jour automatiquement"
              primaryTypographyProps={{ fontSize: '0.875rem' }}
              secondaryTypographyProps={{ fontSize: '0.75rem' }}
            />
          </ListItem>
          <Divider component="li" />
          <ListItem sx={{ py: 0.5 }}>
            <ListItemText 
              primary="3. Explorez les catégories" 
              secondary="Cliquez sur les points du radar ou les lignes du tableau pour mettre en évidence une catégorie"
              primaryTypographyProps={{ fontSize: '0.875rem' }}
              secondaryTypographyProps={{ fontSize: '0.75rem' }}
            />
          </ListItem>
          <Divider component="li" />
          <ListItem sx={{ py: 0.5 }}>
            <ListItemText 
              primary="4. Consultez les recommandations" 
              secondary="Des suggestions personnalisées sont fournies pour chaque catégorie"
              primaryTypographyProps={{ fontSize: '0.875rem' }}
              secondaryTypographyProps={{ fontSize: '0.75rem' }}
            />
          </ListItem>
          <Divider component="li" />
          <ListItem sx={{ py: 0.5 }}>
            <ListItemText 
              primary="5. Exportez votre rapport" 
              secondary="Générez un PDF avec tous vos résultats et suggestions"
              primaryTypographyProps={{ fontSize: '0.875rem' }}
              secondaryTypographyProps={{ fontSize: '0.75rem' }}
            />
          </ListItem>
        </List>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
          <Button 
            onClick={handleHelpClose}
            color="primary"
            size="small"
            sx={{ textTransform: 'none', fontSize: '0.75rem' }}
          >
            J'ai compris
          </Button>
        </Box>
      </Popover>
    </Container>
  );
};

export default App;