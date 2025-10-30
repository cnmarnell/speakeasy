// Comprehensive filler words list categorized by type
export const fillerWords = {
  // Basic vocal fillers
  basic: [
    'um', 'uh', 'er', 'ah', 'eh', 'hmm', 'mhm', 'mm', 'mmm', 'uhm', 'erm'
  ],

  // Discourse markers and transition words
  discourse: [
    'like', 'you know', 'i mean', 'sort of', 'kind of', 'basically', 'actually', 
    'literally', 'obviously', 'clearly', 'definitely', 'absolutely', 'totally',
    'really', 'quite', 'rather', 'pretty much', 'more or less'
  ],

  // Hesitation phrases
  hesitation: [
    'let me see', 'let me think', 'how do i put this', 'what i mean is',
    'how should i say', 'you see', 'the thing is', 'what i\'m trying to say',
    'if you will', 'as it were', 'so to speak', 'in a sense', 'in a way'
  ],

  // Transition fillers
  transition: [
    'so', 'well', 'okay', 'right', 'now', 'then', 'anyway', 'anyhow',
    'moving on', 'next', 'furthermore', 'moreover', 'additionally', 'also'
  ],

  // Confirmation seeking
  confirmation: [
    'right?', 'okay?', 'you know?', 'see?', 'understand?', 'make sense?',
    'follow me?', 'with me?', 'yeah?', 'no?'
  ]
}

// Create a flattened array of all filler words for easy searching
export const allFillerWords = [
  ...fillerWords.basic,
  ...fillerWords.discourse,
  ...fillerWords.hesitation,
  ...fillerWords.transition,
  ...fillerWords.confirmation
]

// Weighted scoring for different types of fillers
export const fillerWeights = {
  basic: 1.0,        // Most noticeable fillers
  discourse: 0.7,    // Moderate impact
  hesitation: 0.8,   // Noticeable but sometimes acceptable
  transition: 0.5,   // Often acceptable in speech
  confirmation: 0.6  // Moderate impact
}

// Get category of a filler word
export const getFillerCategory = (word) => {
  const normalizedWord = word.toLowerCase().trim()
  
  for (const [category, words] of Object.entries(fillerWords)) {
    if (words.includes(normalizedWord)) {
      return category
    }
  }
  return null
}