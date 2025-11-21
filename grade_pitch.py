import boto3
import json

bedrock = boto3.client("bedrock-runtime", region_name="us-east-1")

SYSTEM_PROMPT = """
<system>
You are an evaluation assistant that grades a three-sentence mini elevator pitch.

The pitch must contain:
1. A problem sentence
2. A solution sentence
3. A benefit sentence

Use the rubric:

(PASTE YOUR RUBRIC HERE)

Output ONLY a JSON object with this shape:
{
  "problem_clarity_score": ...,
  "solution_clarity_score": ...,
  "benefit_score": ...,
  "structure_score": ...,
  "tone_score": ...,
  "total_score": ...,
  "reasoning_for_each_category": {
      "problem_clarity": "...",
      "solution_clarity": "...",
      "benefit": "...",
      "structure": "...",
      "tone": "..."
  }
}
</system>
"""

def grade_pitch(transcript: str):

    body = {
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "text": f"""
{SYSTEM_PROMPT}

<user>
Here is the transcript to grade:
{transcript}
</user>
"""
                    }
                ]
            }
        ],
        "inferenceConfig": {
            "maxTokens": 512,
            "temperature": 0
        }
    }

    response = bedrock.invoke_model(
        modelId="amazon.nova-lite-v1:0",
        contentType="application/json",
        accept="application/json",
        body=json.dumps(body),
    )

    response_body = json.loads(response["body"].read())

    # Nova returns in outputText or messages depending on SDK
    if "outputText" in response_body:
        raw_text = response_body["outputText"]
    else:
        raw_text = response_body["messages"][-1]["content"][0]["text"]

    return json.loads(raw_text)

if __name__ == "__main__":
    transcript = "College students struggle with time management. I built an app that organizes all assignments. It helps students stay on track and reduce stress."
    print(json.dumps(grade_pitch(transcript), indent=2))
