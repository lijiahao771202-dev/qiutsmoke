import Foundation
import Capacitor
import CoreMotion

@objc(CoreMotionPlugin)
public class CoreMotionPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "CoreMotionPlugin"
    public let jsName = "CoreMotion"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise)
    ]
    
    private let motionManager = CMMotionManager()
    private var isRunning = false
    
    @objc func start(_ call: CAPPluginCall) {
        guard motionManager.isAccelerometerAvailable else {
            call.reject("Accelerometer not available")
            return
        }
        
        if isRunning {
            call.resolve(["status": "already_running"])
            return
        }
        
        motionManager.accelerometerUpdateInterval = 1.0 / 30.0 // 30 FPS
        
        motionManager.startAccelerometerUpdates(to: .main) { [weak self] data, error in
            guard let self = self, let data = data else { return }
            
            self.notifyListeners("accelUpdate", data: [
                "x": data.acceleration.x * 9.81, // Convert to m/s²
                "y": data.acceleration.y * 9.81,
                "z": data.acceleration.z * 9.81
            ])
        }
        
        isRunning = true
        call.resolve(["status": "started"])
    }
    
    @objc func stop(_ call: CAPPluginCall) {
        motionManager.stopAccelerometerUpdates()
        isRunning = false
        call.resolve(["status": "stopped"])
    }
}
