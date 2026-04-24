import wave
import math
import struct

sample_rate = 44100
duration = 15.0

freq1 = 432.0
freq2 = freq1 * 2.76 
freq3 = freq1 * 5.4

volumes = {
    freq1: 0.5,
    freq2: 0.25,
    freq3: 0.1
}

with wave.open('/Users/lijiahao/medetation/public/bowl.wav', 'w') as wav_file:
    wav_file.setnchannels(1)
    wav_file.setsampwidth(2)
    wav_file.setframerate(sample_rate)

    for i in range(int(sample_rate * duration)):
        t = i / sample_rate
        # Envelopes
        env1 = math.exp(-0.25 * t)
        env2 = math.exp(-0.7 * t)
        env3 = math.exp(-1.5 * t)
        
        # Strike attack
        attack = min(t * 80.0, 1.0)
        
        # Tremolo (throb)
        throb1 = 1.0 + 0.15 * math.sin(2 * math.pi * 3.0 * t)
        throb2 = 1.0 + 0.2 * math.sin(2 * math.pi * 4.5 * t)
        
        sample = attack * (
            volumes[freq1] * env1 * throb1 * math.sin(2 * math.pi * freq1 * t) +
            volumes[freq2] * env2 * throb2 * math.sin(2 * math.pi * freq2 * t) +
            volumes[freq3] * env3 * math.sin(2 * math.pi * freq3 * t)
        )
        
        # Soft hard limits
        sample = max(min(sample, 1.0), -1.0)
        
        value = int(sample * 32767)
        wav_file.writeframes(struct.pack('<h', value))
