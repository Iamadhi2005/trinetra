import time
import json
from patient_simulator import PatientSimulator

def run_continuous_test():
    print("=========================================================")
    print("Starting Continuous Multi-Patient Live Telemetry")
    print("Press Ctrl + C in the terminal to stop at any time.")
    print("=========================================================\n")
    
    sim = PatientSimulator()
    
    try:
        while True:
            # 1. Update physiology for all simulated patients
            sim.update_all()
            
            # 2. Emulate and print telemetry for all patients
            for p_id in sim.patients:
                device_id = f"icu_monitor_{p_id}"
                payload = sim.get_payload(p_id, device_id)
                
                print(f"Device: {device_id} | Patient: {p_id}")
                print(json.dumps(payload, indent=2))
                print("-" * 50)
                
            print("\nWaiting 1 second for next live telemetry broadcast...\n")
            time.sleep(1.0)
            
    except KeyboardInterrupt:
        print("\nSimulator stopped by user. Exiting safely.")

if __name__ == "__main__":
    run_continuous_test()
