# VentureNerve — Venture Risk Metrics & Portfolio Simulation

VentureNerve is a platform that helps analyse startup risk and construct venture portfolios using quantitative simulation.

Live App:

https://venture-nerve-match.base44.app/Landing

---

# Demo Video

See demo in:

demo/VentureNerve-Demo.mp4

---

# Overview

VentureNerve consists of:

Frontend Application and Python Quantitative Simulation Engine

The frontend provides an interactive demonstration interface.

The Python backend contains the quantitative models used to simulate startup outcomes and investor portfolio performance.

The frontend currently displays the platform interface, while the backend contains the modelling framework that supports the concepts shown.

---

# Core Idea

Startup outcomes are uncertain.

Instead of predicting a single outcome, VentureNerve simulates thousands of possible futures.

This allows analysis of:

• failure risk  
• runway risk  
• return distributions  
• portfolio performance  

---

# Repository Structure

```
VentureNerve/

frontend/

src/vs_sim/

    startup_mc.py

    vc_simulator.py

    portfolio.py

    portfolio_builder.py

    investor_metrics.py

demo/

pyproject.toml

README.md
```

---

# Backend Simulation Components

Startup Simulation

File:

src/vs_sim/startup_mc.py

Simulates:

• cash balance  
• burn  
• runway  
• distress probability  

---

Venture Return Simulation

File:

src/vs_sim/vc_simulator.py

Simulates:

• valuation evolution  
• exit outcomes  
• ROI  
• IRR  

---

Portfolio Simulation

Files:

src/vs_sim/portfolio.py

src/vs_sim/portfolio_builder.py

Simulates:

• portfolio returns  
• different portfolio allocations  

---

Investor Metrics

File:

src/vs_sim/investor_metrics.py

Computes:

• risk-adjusted return metrics  

---

# Live Application

Frontend Demo:

https://venture-nerve-match.base44.app/Landing

This demonstrates the VentureNerve platform interface.

---

# Installation

Install backend:

```
pip install -e .
```

Example:

```
from vs_sim.vc_simulator import run_vc_return_simulator_uncertain
```

---

# Demo

Demo video included in:

demo/VentureNerve-Demo.mp4

---

# Tech Stack

Frontend

React  
Base44  

Backend

Python  
NumPy

---

# Authors

Shrivar Singh, Iakov Bondyaev and Shen Jie Yaw
