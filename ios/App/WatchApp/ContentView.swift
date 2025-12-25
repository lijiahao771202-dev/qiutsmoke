import SwiftUI

struct ContentView: View {
    @EnvironmentObject var viewModel: BreathingViewModel
    
    var body: some View {
        ZStack {
            // Background
            Color.black.ignoresSafeArea()
            
            VStack(spacing: 12) {
                // Remaining Time
                Text(viewModel.formattedTimeRemaining)
                    .font(.system(size: 20, weight: .medium, design: .rounded))
                    .foregroundColor(.white.opacity(0.8))
                
                Spacer()
                
                // Breathing Circle
                ZStack {
                    // Animated Circle
                    Circle()
                        .fill(
                            RadialGradient(
                                gradient: Gradient(colors: [
                                    viewModel.phaseColor.opacity(0.6),
                                    viewModel.phaseColor.opacity(0.2)
                                ]),
                                center: .center,
                                startRadius: 0,
                                endRadius: 60
                            )
                        )
                        .frame(width: viewModel.circleSize, height: viewModel.circleSize)
                        .animation(.easeInOut(duration: viewModel.currentPhaseDuration), value: viewModel.circleSize)
                    
                    // Phase Text
                    VStack(spacing: 4) {
                        Text(viewModel.phaseText)
                            .font(.system(size: 18, weight: .semibold))
                            .foregroundColor(.white)
                        
                        // Heart Rate
                        if let bpm = viewModel.currentBPM {
                            HStack(spacing: 4) {
                                Image(systemName: "heart.fill")
                                    .foregroundColor(.red)
                                    .font(.system(size: 12))
                                Text("\(bpm)")
                                    .font(.system(size: 14, weight: .medium))
                                    .foregroundColor(.white.opacity(0.9))
                            }
                        }
                    }
                }
                
                Spacer()
                
                // Control Button
                if !viewModel.isPracticing {
                    Button(action: { viewModel.startPractice() }) {
                        Image(systemName: "play.fill")
                            .font(.system(size: 24))
                            .foregroundColor(.white)
                            .frame(width: 50, height: 50)
                            .background(Color.green.opacity(0.8))
                            .clipShape(Circle())
                    }
                    .buttonStyle(PlainButtonStyle())
                }
            }
            .padding(.vertical, 8)
        }
    }
}

#Preview {
    ContentView()
        .environmentObject(BreathingViewModel())
}
