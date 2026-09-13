import matplotlib.pyplot as plt
import numpy as np

# Set high DPI and professional academic styling
plt.rcParams['font.family'] = 'DejaVu Sans'
plt.rcParams['font.size'] = 10

fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(11, 4.5), dpi=300)

# ==================== GRAPH 1: Per-Attack Category Detection Rate ====================
categories = ['Benign (Normal)', 'ARP Spoofing', 'MQTT DDoS\nConnect Flood', 'MQTT DDoS\nPublish Flood']
detection_rates = [100.00, 91.11, 100.00, 100.00]
colors_list = ['#0284C7', '#D97706', '#DC2626', '#DC2626']

bars = ax1.bar(categories, detection_rates, color=colors_list, width=0.55, edgecolor='#0F172A', linewidth=1.2, zorder=3)
ax1.set_ylim(0, 115)
ax1.set_ylabel('Detection Accuracy / Specificity (%)', fontweight='bold', fontsize=11, color='#0F172A')
ax1.set_title('Real Multi-Attack Detection Rates (CIC-IoMT-2024)', fontweight='bold', fontsize=12, color='#0F172A', pad=12)
ax1.grid(axis='y', linestyle='--', alpha=0.5, zorder=0)

for bar in bars:
    height = bar.get_height()
    ax1.text(bar.get_x() + bar.get_width()/2., height + 2.5,
             f'{height:.2f}%',
             ha='center', va='bottom', fontsize=9.5, fontweight='bold', color='#0F172A')

ax1.tick_params(axis='x', rotation=10, labelsize=9)

# ==================== GRAPH 2: Core ML Performance Metrics Summary ====================
metrics = ['Accuracy', 'Precision', 'Recall', 'F1-Score', 'ROC-AUC']
values = [99.83, 100.00, 99.70, 99.85, 100.00] # AUC mapped to 100 for visual comparison
metric_colors = ['#0D9488', '#0284C7', '#2563EB', '#7C3AED', '#059669']

bars2 = ax2.barh(metrics, values, color=metric_colors, height=0.5, edgecolor='#0F172A', linewidth=1.2, zorder=3)
ax2.set_xlim(85, 104)
ax2.set_xlabel('Score (%) [Evaluated on 89,683 Real Flows]', fontweight='bold', fontsize=11, color='#0F172A')
ax2.set_title('Layer 2 Random Forest Evaluation Metrics', fontweight='bold', fontsize=12, color='#0F172A', pad=12)
ax2.grid(axis='x', linestyle='--', alpha=0.5, zorder=0)
ax2.invert_yaxis()

for bar in bars2:
    width = bar.get_width()
    ax2.text(width + 0.4, bar.get_y() + bar.get_height()/2.,
             f'{width:.2f}%',
             ha='left', va='center', fontsize=9.5, fontweight='bold', color='#0F172A')

plt.tight_layout()
output_chart = "trinetra_review_result_chart.png"
plt.savefig(output_chart, bbox_inches='tight', dpi=300)
print(f"Chart saved successfully as: {output_chart}")
