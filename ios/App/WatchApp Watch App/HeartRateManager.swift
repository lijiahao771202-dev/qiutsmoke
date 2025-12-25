import HealthKit

class HeartRateManager: NSObject, HKWorkoutSessionDelegate, HKLiveWorkoutBuilderDelegate {
    private let healthStore = HKHealthStore()
    private var session: HKWorkoutSession?
    private var builder: HKLiveWorkoutBuilder?
    private var onHeartRateUpdate: ((Int) -> Void)?
    
    init(onHeartRateUpdate: @escaping (Int) -> Void) {
        self.onHeartRateUpdate = onHeartRateUpdate
        super.init()
    }
    
    func startWorkout() {
        // Check HealthKit authorization
        let heartRateType = HKQuantityType.quantityType(forIdentifier: .heartRate)!
        
        healthStore.requestAuthorization(toShare: nil, read: [heartRateType]) { [weak self] success, error in
            guard success else { return }
            self?.startWorkoutSession()
        }
    }
    
    private func startWorkoutSession() {
        let configuration = HKWorkoutConfiguration()
        configuration.activityType = .mindAndBody
        configuration.locationType = .indoor
        
        do {
            session = try HKWorkoutSession(healthStore: healthStore, configuration: configuration)
            builder = session?.associatedWorkoutBuilder()
            
            session?.delegate = self
            builder?.delegate = self
            
            builder?.dataSource = HKLiveWorkoutDataSource(
                healthStore: healthStore,
                workoutConfiguration: configuration
            )
            
            session?.startActivity(with: Date())
            builder?.beginCollection(withStart: Date()) { _, _ in }
        } catch {
            print("Failed to start workout session: \(error)")
        }
    }
    
    func stopWorkout() {
        session?.end()
        builder?.endCollection(withEnd: Date()) { _, _ in }
    }
    
    // MARK: - HKWorkoutSessionDelegate
    func workoutSession(_ workoutSession: HKWorkoutSession, didChangeTo toState: HKWorkoutSessionState, from fromState: HKWorkoutSessionState, date: Date) {
        // Handle state changes if needed
    }
    
    func workoutSession(_ workoutSession: HKWorkoutSession, didFailWithError error: Error) {
        print("Workout session failed: \(error)")
    }
    
    // MARK: - HKLiveWorkoutBuilderDelegate
    func workoutBuilder(_ workoutBuilder: HKLiveWorkoutBuilder, didCollectDataOf collectedTypes: Set<HKSampleType>) {
        for type in collectedTypes {
            guard let quantityType = type as? HKQuantityType,
                  quantityType == HKQuantityType.quantityType(forIdentifier: .heartRate) else { continue }
            
            if let statistics = workoutBuilder.statistics(for: quantityType) {
                let heartRateUnit = HKUnit.count().unitDivided(by: HKUnit.minute())
                if let value = statistics.mostRecentQuantity()?.doubleValue(for: heartRateUnit) {
                    let bpm = Int(value)
                    onHeartRateUpdate?(bpm)
                }
            }
        }
    }
    
    func workoutBuilderDidCollectEvent(_ workoutBuilder: HKLiveWorkoutBuilder) {
        // Handle events if needed
    }
}
