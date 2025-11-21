#!/usr/bin/env python3
"""
Simple test script for AWS Bedrock Nova Lite model
Tests elevator pitch grading using the system prompt from system_prompt.txt
"""

import boto3
import json

def load_system_prompt():
    """Load the system prompt from system_prompt.txt"""
    try:
        with open('system_prompt.txt', 'r') as f:
            return f.read().strip()
    except FileNotFoundError:
        print("Error: system_prompt.txt file not found!")
        print("Make sure the file exists in the current directory.")
        return None

def call_nova_lite(system_prompt, user_transcript):
    """Call AWS Bedrock Nova Lite model with system prompt and user transcript"""
    
    # Initialize Bedrock client
    client = boto3.client('bedrock-runtime', region_name='us-east-1')
    
    # Combine system prompt with user transcript for Nova Lite
    combined_prompt = f"{system_prompt}\n\nTranscript to evaluate:\n{user_transcript}"
    
    try:
        # Call Nova Lite model using Converse API (no system role support)
        response = client.converse(
            modelId="amazon.nova-lite-v1:0",
            messages=[
                {
                    "role": "user",
                    "content": [{"text": combined_prompt}]
                }
            ],
            inferenceConfig={
                "maxTokens": 1000,
                "temperature": 0.1,
                "topP": 0.9
            }
        )
        
        # Extract the response text
        response_text = response['output']['message']['content'][0]['text']
        return response_text
        
    except Exception as e:
        print(f"Error calling Nova Lite: {e}")
        return None

def main():
    """Main function to run the test"""
    print("=== AWS Bedrock Nova Lite Elevator Pitch Grader ===\n")
    
    # Load system prompt
    print("Loading system prompt from system_prompt.txt...")
    system_prompt = load_system_prompt()
    
    if not system_prompt:
        return
    
    print("✓ System prompt loaded successfully\n")
    print("System prompt preview:")
    print("-" * 50)
    print(system_prompt[:200] + "..." if len(system_prompt) > 200 else system_prompt)
    print("-" * 50)
    print()
    
    while True:
        # Get user input
        print("Enter a student's elevator pitch transcript (or 'quit' to exit):")
        print("Example: 'Traffic congestion costs people hours daily. Our app finds optimal routes using real-time data. Users save 30 minutes per commute and reduce stress.'")
        print()
        
        user_input = input("Transcript: ").strip()
        
        if user_input.lower() in ['quit', 'exit', 'q']:
            print("Goodbye!")
            break
            
        if not user_input:
            print("Please enter a transcript.\n")
            continue
        
        print("\n" + "="*60)
        print("CALLING NOVA LITE MODEL...")
        print("="*60)
        
        # Call Nova Lite
        response = call_nova_lite(system_prompt, user_input)
        
        if response:
            print("\n📊 GRADING RESPONSE:")
            print("-" * 40)
            
            # Try to parse as JSON for pretty printing
            try:
                json_response = json.loads(response)
                print(json.dumps(json_response, indent=2))
                
                # Show summary
                if 'total_score' in json_response:
                    total = json_response['total_score']
                    print(f"\n🎯 TOTAL SCORE: {total}/15")
                    
                    if total >= 13:
                        print("🟢 EXCELLENT pitch!")
                    elif total >= 10:
                        print("🟡 GOOD pitch with room for improvement")
                    else:
                        print("🔴 NEEDS WORK - focus on clarity and structure")
                        
            except json.JSONDecodeError:
                print("Raw response (not valid JSON):")
                print(response)
        else:
            print("❌ Failed to get response from Nova Lite")
        
        print("\n" + "="*60 + "\n")

if __name__ == "__main__":
    # Check if AWS credentials are configured
    try:
        boto3.Session().get_credentials()
        main()
    except Exception as e:
        print("Error: AWS credentials not configured!")
        print("Make sure you have:")
        print("1. AWS CLI configured: aws configure")
        print("2. Or environment variables: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY")
        print(f"Error details: {e}")