import SwiftUI
import WatchKit
import Combine

enum BreathPhase: String {
    case inhale = "吸气"
    case hold = "屏气"
    case exhale = "呼气"
    case idle = "准备"
}

class BreathingViewModel: ObservableObject {
    // MARK: - Published Properties
    @Published var phase: BreathPhase = .idle
    @Published var isPracticing = false
    @Published var timeRemaining: Int = 180 // 3 minutes default
    @Published var currentBPM: Int? = nil
    
    // MARK: - Breathing Config
    let inhaleDuration: Double = 4.0
    let holdDuration: Double = 4.0
    let exhaleDuration: Double = 6.0
    
    // MARK: - Private
    private var breathTimer: Timer?
    private var countdownTimer: Timer?
    private var heartRateManager: HeartRateManager?
    
    // MARK: - Computed Properties
    var phaseText: String {
        phase.rawValue
    }
    
    var phaseColor: Color {
        switch phase {
        case .inhale: return .cyan
        case .hold: return .purple
        case .exhale: return .blue
        case .idle: return .gray
        }
    }
    
    var circleSize: CGFloat {
        switch phase {
        case .inhale: return 100
        case .hold: return 100
        case .exhale: return 50
        case .idle: return 70
        }
    }
    
    var currentPhaseDuration: Double {
        switch phase {
        case .inhale: return inhaleDuration
        case .hold: return holdDuration
        case .exhale: return exhaleDuration
        case .idle: return 0.3
        }
    }
    
    var formattedTimeRemaining: String {
        let mins = timeRemaining / 60
        let secs = timeRemaining % 60
        return String(format: "%d:%02d", mins, secs)
    }
    
    // MARK: - Init
    init() {
        heartRateManager = HeartRateManager { [weak self] bpm in
            DispatchQueue.main.async {
                self?.currentBPM = bpm
            }
        }
    }
    
    // MARK: - Practice Control
    func startPractice() {
        isPracticing = true
        timeRemaining = 180 // Reset to 3 minutes
        
        // Start heart rate monitoring
        heartRateManager?.startWorkout()
        
        // Start haptic
        HapticManager.shared.playStart()
        
        // Start countdown
        countdownTimer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
            self?.tick()
        }
        
        // Start breathing cycle
        runBreathingCycle()
    }
    
    func stopPractice() {
        isPracticing = false
        phase = .idle
        
        breathTimer?.invalidate()
        breathTimer = nil
        countdownTimer?.invalidate()
        countdownTimer = nil
        
        heartRateManager?.stopWorkout()
        HapticManager.shared.playSuccess()
    }
    
    // MARK: - Private Methods
    private func tick() {
        if timeRemaining > 0 {
            timeRemaining -= 1
        } else {
            stopPractice()
        }
    }
    
    private func runBreathingCycle() {
        guard isPracticing else { return }
        
        // Inhale
        phase = .inhale
        HapticManager.shared.playInhale()
        
        breathTimer = Timer.scheduledTimer(withTimeInterval: inhaleDuration, repeats: false) { [weak self] _ in
            self?.startHold()
        }
    }
    
    private func startHold() {
        guard isPracticing else { return }
        
        phase = .hold
        HapticManager.shared.playHold()
        
        breathTimer = Timer.scheduledTimer(withTimeInterval: holdDuration, repeats: false) { [weak self] _ in
            self?.startExhale()
        }
    }
    
    private func startExhale() {
        guard isPracticing else { return }
        
        phase = .exhale
        HapticManager.shared.playExhale()
        
        breathTimer = Timer.scheduledTimer(withTimeInterval: exhaleDuration, repeats: false) { [weak self] _ in
            self?.runBreathingCycle() // Loop back to inhale
        }
    }
}
