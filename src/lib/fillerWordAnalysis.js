import { allFillerWords, fillerWords, fillerWeights, getFillerCategory } from '../data/fillerWords'

// Main function to analyze filler words in a transcript
export const analyzeFillerWords = (transcript) => {
  if (!transcript || typeof transcript !== 'string') {
    return {
      totalCount: 0,
      weightedScore: 0,
      fillerWordsUsed: [],
      categoryBreakdown: {},
      analysis: "No transcript available for filler word analysis."
    }
  }

  // Clean and normalize the transcript
  const cleanTranscript = transcript.toLowerCase()
    .replace(/[^\w\s']/g, ' ') // Remove punctuation except apostrophes
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()

  const words = cleanTranscript.split(' ')
  const fillerDetections = []
  const categoryCount = {}

  // Initialize category counts
  Object.keys(fillerWords).forEach(category => {
    categoryCount[category] = 0
  })

  // Check each word/phrase for filler words
  for (let i = 0; i < words.length; i++) {
    const word = words[i]
    
    // Check single words
    if (allFillerWords.includes(word)) {
      const category = getFillerCategory(word)
      if (category) {
        fillerDetections.push({
          word: word,
          category: category,
          position: i,
          weight: fillerWeights[category]
        })
        categoryCount[category]++
      }
    }

    // Check multi-word phrases (2-4 words)
    for (let phraseLength = 2; phraseLength <= Math.min(4, words.length - i); phraseLength++) {
      const phrase = words.slice(i, i + phraseLength).join(' ')
      
      if (allFillerWords.includes(phrase)) {
        const category = getFillerCategory(phrase)
        if (category) {
          fillerDetections.push({
            word: phrase,
            category: category,
            position: i,
            weight: fillerWeights[category]
          })
          categoryCount[category]++
          break // Don't check longer phrases if we found a match
        }
      }
    }
  }

  // Remove duplicates and overlapping detections
  const uniqueFillers = removeDuplicateDetections(fillerDetections)

  // Calculate metrics
  const totalCount = uniqueFillers.length
  const weightedScore = uniqueFillers.reduce((sum, filler) => sum + filler.weight, 0)
  
  // Count individual filler words
  const wordCounts = {}
  uniqueFillers.forEach(filler => {
    wordCounts[filler.word] = (wordCounts[filler.word] || 0) + 1
  })
  
  // Get unique filler words used
  const fillerWordsUsed = [...new Set(uniqueFillers.map(f => f.word))].sort()

  // Calculate speech duration estimate (assuming average 150 words per minute)
  const estimatedDurationMinutes = words.length / 150
  const fillersPerMinute = estimatedDurationMinutes > 0 ? totalCount / estimatedDurationMinutes : 0

  // Generate analysis text
  const analysis = generateFillerAnalysis(totalCount, fillersPerMinute, categoryCount, wordCounts)

  return {
    totalCount,
    weightedScore: Math.round(weightedScore * 10) / 10, // Round to 1 decimal
    fillerWordsUsed,
    categoryBreakdown: categoryCount,
    fillersPerMinute: Math.round(fillersPerMinute * 10) / 10,
    analysis,
    detections: uniqueFillers // For debugging/detailed view
  }
}

// Remove overlapping and duplicate detections
const removeDuplicateDetections = (detections) => {
  // Sort by position to handle overlaps
  const sorted = detections.sort((a, b) => a.position - b.position)
  const unique = []
  
  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i]
    const isOverlapping = unique.some(existing => {
      const currentEnd = current.position + current.word.split(' ').length - 1
      const existingEnd = existing.position + existing.word.split(' ').length - 1
      
      // Check if positions overlap
      return (current.position <= existingEnd && currentEnd >= existing.position)
    })
    
    if (!isOverlapping) {
      unique.push(current)
    }
  }
  
  return unique
}

// Generate human-readable analysis
const generateFillerAnalysis = (totalCount, fillersPerMinute, categoryBreakdown, wordCounts) => {
  if (totalCount === 0) {
    return "**Excellent!** No filler words detected. Your speech was clear and confident."
  }

  // Get filler word score for context
  const score = getFillerWordScoreFromRate(fillersPerMinute)
  let performance = "Good"
  if (score >= 95) performance = "Excellent"
  else if (score >= 88) performance = "Very Good"
  else if (score >= 75) performance = "Good"
  else if (score >= 60) performance = "Needs Improvement"
  else performance = "Poor"

  // Create detailed feedback
  let analysis = `**Filler Word Analysis (${performance})**\n\n`
  
  // Summary stats
  analysis += `**Summary:**\n`
  analysis += `• Total filler words: ${totalCount}\n`
  analysis += `• Rate: ${fillersPerMinute} per minute\n`
  analysis += `• Score: ${score}/100\n\n`
  
  // Specific words detected
  if (Object.keys(wordCounts).length > 0) {
    analysis += `**Detected filler words:**\n`
    const sortedWords = Object.entries(wordCounts)
      .sort(([,a], [,b]) => b - a) // Sort by count, highest first
      .map(([word, count]) => `• "${word}" (${count} time${count > 1 ? 's' : ''})`)
      .join('\n')
    analysis += sortedWords + '\n\n'
  }
  
  // Category breakdown (only show categories with counts > 0)
  const activeCategories = Object.entries(categoryBreakdown)
    .filter(([category, count]) => count > 0)
  
  if (activeCategories.length > 0) {
    analysis += `**Breakdown by type:**\n`
    activeCategories.forEach(([category, count]) => {
      const categoryName = category.charAt(0).toUpperCase() + category.slice(1)
      analysis += `• ${categoryName}: ${count}\n`
    })
    analysis += '\n'
  }
  
  // Improvement suggestions based on performance
  analysis += `**Suggestions for improvement:**\n`
  if (fillersPerMinute > 8) {
    analysis += `• Practice pausing instead of using filler words\n`
    analysis += `• Slow down your speech pace to reduce hesitation\n`
    analysis += `• Record yourself practicing to become more aware of filler usage\n`
  } else if (fillersPerMinute > 4) {
    analysis += `• Focus on reducing the most common fillers you use\n`
    analysis += `• Practice transitional phrases instead of filler words\n`
  } else if (fillersPerMinute > 2) {
    analysis += `• Work on eliminating specific filler words you use most\n`
    analysis += `• Practice confident pauses for emphasis\n`
  } else {
    analysis += `• Great job! Maintain this level of clarity in future speeches\n`
    analysis += `• Continue practicing to eliminate the few remaining fillers\n`
  }

  return analysis
}

// Helper function to get score from rate (for internal use)
const getFillerWordScoreFromRate = (fillersPerMinute) => {
  if (fillersPerMinute <= 1) return 100
  if (fillersPerMinute <= 2) return 95
  if (fillersPerMinute <= 3) return 88
  if (fillersPerMinute <= 4) return 82
  if (fillersPerMinute <= 5) return 75
  if (fillersPerMinute <= 6) return 68
  if (fillersPerMinute <= 8) return 60
  if (fillersPerMinute <= 10) return 50
  if (fillersPerMinute <= 12) return 40
  return Math.max(20, 40 - Math.floor((fillersPerMinute - 12) * 2))
}

// Helper function to get filler word score for grading
export const getFillerWordScore = (fillerAnalysis) => {
  const { totalCount, fillersPerMinute } = fillerAnalysis
  
  // Score based on fillers per minute (0-100 scale)
  if (fillersPerMinute <= 1) return 100
  if (fillersPerMinute <= 2) return 95
  if (fillersPerMinute <= 3) return 88
  if (fillersPerMinute <= 4) return 82
  if (fillersPerMinute <= 5) return 75
  if (fillersPerMinute <= 6) return 68
  if (fillersPerMinute <= 8) return 60
  if (fillersPerMinute <= 10) return 50
  if (fillersPerMinute <= 12) return 40
  return Math.max(20, 40 - Math.floor((fillersPerMinute - 12) * 2))
}

// Export for testing/debugging
export const testFillerAnalysis = (text) => {
  console.log('Testing filler analysis for:', text)
  const result = analyzeFillerWords(text)
  console.log('Result:', result)
  return result
}

// Test function to verify the enhanced filler word analysis
export const demonstrateFillerAnalysis = () => {
  console.log('=== FILLER WORD ANALYSIS DEMO ===')
  
  const testCases = [
    {
      name: "Clean Speech",
      text: "Traffic congestion costs people hours daily. Our app finds optimal routes using real-time data. Users save thirty minutes per commute and reduce stress."
    },
    {
      name: "With Fillers", 
      text: "Um, traffic congestion, like, costs people hours daily, you know? Our app, uh, finds optimal routes using, basically, real-time data. Users, um, save thirty minutes per commute and, like, reduce stress."
    },
    {
      name: "Heavy Fillers",
      text: "Um, so like, traffic congestion, you know, um, costs people hours daily, right? Our app, uh, basically finds, um, optimal routes using, like, real-time data, okay? Users, um, save, like, thirty minutes per commute and, uh, reduce stress, you know?"
    }
  ]
  
  testCases.forEach(testCase => {
    console.log(`\n--- Testing: ${testCase.name} ---`)
    const result = analyzeFillerWords(testCase.text)
    console.log('Analysis:', result.analysis)
    console.log('Stats:', {
      totalCount: result.totalCount,
      fillersPerMinute: result.fillersPerMinute,
      score: getFillerWordScore(result)
    })
  })
  
  return "Demo complete - check console for results"
}