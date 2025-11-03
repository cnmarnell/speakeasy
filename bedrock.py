import boto3
import json

# Configuration - UPDATE THESE VALUES
AGENT_ID = "YOUR_AGENT_ID"  # Replace with your Agent ID
AGENT_ALIAS_ID = "YOUR_ALIAS_ID"  # Replace with your Agent Alias ID (often "TSTALIASID" for test)
AWS_REGION = "us-east-1"  # Replace with your region

# Initialize the client
client = boto3.client('bedrock-agent-runtime', region_name=AWS_REGION)

# Your prompt to the agent

prompt = ("transcript")
# Invoke the agent
response = client.invoke_agent(
    agentId="ZEHFOMDDKA",
    agentAliasId="JCKPINXRX7",
    sessionId='session-123',  # Can be any unique string for conversation continuity
    inputText=prompt
)

# Process and print the streaming response
print(f"\nPrompt: {prompt}")
print("\nAgent Response:")
print("-" * 50)

response_text = ""
for event in response['completion']:
    if 'chunk' in event:
        chunk = event['chunk']
        if 'bytes' in chunk:
            response_text += chunk['bytes'].decode('utf-8')

print(response_text)