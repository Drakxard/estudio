export async function callGroqAPI(prompt, taskType = "chat") {
  const startTime = Date.now()

  try {
    console.log("🤖 GROQ API Call Starting...")
    console.log(`📝 Prompt length: ${prompt.length} characters`)
    console.log(`🎯 Task type: ${taskType}`)

    if (!process.env.GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY not found in environment variables")
    }

    console.log("🔑 API Key validated")

      selectedModel = "llama-3.1-8b-instant"

    // Enhanced system prompt with LaTeX formatting instructions
    const systemPrompt = `Eres un asistente especializado en matemáticas y educación adaptativa. 

CONTEXTO EDUCATIVO:
Adapta tu respuesta al nivel del estudiante y proporciona explicaciones claras y pedagógicas.
Si tienes contexto de materiales de estudio, úsalo para dar respuestas más precisas y relevantes.`

    const requestBody = {
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      model: selectedModel,
      max_tokens: 1000,
      temperature: 0.7,
    }

    console.log(`📊 Request config: ${selectedModel}, max_tokens: 1000`)
    console.log("🌐 Sending request to GROQ...")

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    })

    const responseTime = Date.now() - startTime
    console.log(`⏱️ Response received in ${responseTime}ms`)

    if (!response.ok) {
      const errorData = await response.json()
      console.log(`❌ GROQ API Error ${response.status}: ${JSON.stringify(errorData)}`)

      // Try fallback model if primary fails
      if (selectedModel !== "llama-3.1-8b-instant") {
        console.log("🔄 Trying fallback model...")
        return callGroqAPI(prompt, "chat") // Use chat as fallback
      }

      throw new Error(`GROQ API error (${response.status}): ${JSON.stringify(errorData)}`)
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content

    if (!content) {
      throw new Error("No content in GROQ API response")
    }

    console.log(`✅ GROQ API Success in ${responseTime}ms`)
    console.log(`📄 Response length: ${content.length} characters`)

    return content.trim()
  } catch (error) {
    const errorTime = Date.now() - startTime
    console.error(`❌ GROQ API Error after ${errorTime}ms: ${error.message}`)
    throw error
  }
}


