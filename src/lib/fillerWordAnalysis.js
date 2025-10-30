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
    return "No filler words detected."
  }

  // Create simple list of filler words with counts
  const wordCountList = Object.entries(wordCounts)
    .map(([word, count]) => `"${word}" (${count})`)
    .join(', ')
  
  return wordCountList
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