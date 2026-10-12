import asyncio
import os
import edge_tts

OUTPUT_DIR = os.path.join("apps", "admin-web", "public", "pte", "test1")
os.makedirs(OUTPUT_DIR, exist_ok=True)

async def gen(text: str, filename: str, voice: str = "en-US-JennyNeural"):
    out_path = os.path.join(OUTPUT_DIR, filename)
    communicate = edge_tts.Communicate(text, voice)
    await communicate.save(out_path)
    print(f"Generated: {out_path} ({os.path.getsize(out_path)} bytes)")

async def generate_all():
    # Q1 Read Aloud (Sample / Model answer)
    q1_text = (
        "Sleep behavior is also known as a sleep disorder. People with sleep disorders often talk or walk in their sleep. "
        "They are not aware of what they are talking about or where they are going. There aren't any serious effects on the body in general "
        "but it may be connected to mental health. People with childhood trauma, unspeakable problems or depression are the ones with different sleep behavior."
    )
    await gen(q1_text, "q1_ra_sample.mp3", "en-US-JennyNeural")

    # Q2 Repeat Sentence
    q2_text = "At that time, people moved from towns to villages."
    await gen(q2_text, "q2_rs.mp3", "en-US-GuyNeural")

    # Q4 Re-tell Lecture
    q4_text = (
        "To be a successful entrepreneur, you should have good ideas, but the definition of a good idea varies depending on whom you ask. "
        "A great idea should have several features. Firstly, the great idea should be various and novel. "
        "Secondly, the great idea should be unique, which means no one has thought about it. "
        "Thirdly, it is essential for great ideas to be transformative and productive. "
        "All ideas are essentially a combination of other smaller ideas, but this doesn’t mean they can’t be unique. "
        "Merely copying doesn’t make anything idiosyncratic, it’s the individuality that one puts in which makes a concept stand out. "
        "Constant innovation leaves no room for stagnation and thus, adds on to the basic idea, effectively making it unique. "
        "Unique ideas are inspired by basic things, they are simply extensions of pre-existing notions. "
        "And, an idea or a concept is unique only when it transcends its predecessor and serves its purpose in a better and more precise way."
    )
    await gen(q4_text, "q4_rl.mp3", "en-US-GuyNeural")

    # Q5 Group Discussion (Multi-speaker)
    # Generate each speaker's audio chunk and concatenate
    sgd_chunks = [
        ("Speaker 1: I think the biggest shift we're seeing in creative fields is the integration of Artificial Intelligence. Some people are worried that AI will replace human artists, but I see it more as a powerful tool. It can handle repetitive tasks and generate initial ideas, which frees up artists to focus on the more complex, emotional aspects of creativity.", "en-US-JennyNeural"),
        ("Speaker 2: I see your point, but I'm more skeptical. My concern is about originality. If everyone is using the same AI models, won't we see a homogenization of art? The unique style of an artist might get lost. Plus, there are ethical issues around copyright, especially when AI is trained on existing artists' work without their permission.", "en-US-GuyNeural"),
        ("Speaker 3: Both are valid points. I think the solution lies in regulation and how we use the technology. AI is incredibly efficient for brainstorming and creating variations, which is a huge benefit. However, we need clear guidelines on data usage and intellectual property to protect artists.", "en-AU-NatashaNeural"),
        ("Speaker 1: Exactly. For example, a designer could use AI to generate a hundred different logo concepts in minutes, but it still requires a human eye to select the best one and refine it. It's about augmenting our process, not automating our judgment. The final emotional connection comes from the artist.", "en-US-JennyNeural"),
        ("Speaker 2: But that reliance can become a crutch. If young artists lean too heavily on AI for initial ideas, they might not develop their own fundamental skills of sketching and conceptualization. It could lead to a generation of artists who are great curators but not necessarily great creators. The ethical point about training data also remains a major unresolved issue.", "en-US-GuyNeural"),
        ("Speaker 3: I agree, which is why the framework is so important. The future isn't about AI versus human artists; it's about ethical collaboration. This framework should ensure transparent data sourcing and perhaps even a system for royalties. The goal should be to augment human creativity, not replace it, and that requires rules to protect both originality and the rights of all creators.", "en-AU-NatashaNeural"),
    ]
    
    combined_audio = b""
    for text, voice in sgd_chunks:
        comm = edge_tts.Communicate(text, voice)
        async for chunk in comm.stream():
            if chunk["type"] == "audio":
                combined_audio += chunk["data"]
    
    sgd_path = os.path.join(OUTPUT_DIR, "q5_sgd.mp3")
    with open(sgd_path, "wb") as f:
        f.write(combined_audio)
    print(f"Generated: {sgd_path} ({len(combined_audio)} bytes)")

    # Q6 Respond to a Situation
    q6_text = (
        "You're at a local café and realize you left your wallet at home after ordering. "
        "The cashier is waiting for payment, and you don't have enough time to go back home. "
        "What would you say to the cashier to resolve the situation?"
    )
    await gen(q6_text, "q6_rts.mp3", "en-US-JennyNeural")

if __name__ == "__main__":
    asyncio.run(generate_all())
