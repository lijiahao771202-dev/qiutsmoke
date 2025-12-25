import SwiftUI

@main
struct BreathingPracticeApp: App {
    @StateObject private var viewModel = BreathingViewModel()
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(viewModel)
        }
    }
}
