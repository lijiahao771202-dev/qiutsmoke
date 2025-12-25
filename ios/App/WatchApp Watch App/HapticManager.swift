import WatchKit

class HapticManager {
    static let shared = HapticManager()
    
    private init() {}
    
    func playStart() {
        WKInterfaceDevice.current().play(.start)
    }
    
    func playInhale() {
        WKInterfaceDevice.current().play(.directionUp)
    }
    
    func playHold() {
        WKInterfaceDevice.current().play(.click)
    }
    
    func playExhale() {
        WKInterfaceDevice.current().play(.directionDown)
    }
    
    func playSuccess() {
        WKInterfaceDevice.current().play(.success)
    }
    
    func playStop() {
        WKInterfaceDevice.current().play(.stop)
    }
}
