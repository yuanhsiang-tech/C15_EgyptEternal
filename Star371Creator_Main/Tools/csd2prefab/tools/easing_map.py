# Cocos2dx Easing Functions Map
# Maps Type ID to Easing Function Implementation Name
import math

# Easing Function Implementations
def linear(start, end, t):
    """Linear interpolation"""
    return start + (end - start) * t

def sine_ease_in(start, end, t):
    """Sine EaseIn"""
    return start + (end - start) * (1 - math.cos(t * math.pi / 2))

def sine_ease_out(start, end, t):
    """Sine EaseOut"""
    return start + (end - start) * math.sin(t * math.pi / 2)

def sine_ease_in_out(start, end, t):
    """Sine EaseInOut"""
    return start + (end - start) * (1 - math.cos(t * math.pi)) / 2

def quad_ease_in(start, end, t):
    """Quad EaseIn"""
    return start + (end - start) * t * t

def quad_ease_out(start, end, t):
    """Quad EaseOut"""
    return start + (end - start) * (1 - (1 - t) * (1 - t))

def quad_ease_in_out(start, end, t):
    """Quad EaseInOut"""
    if t < 0.5:
        return start + (end - start) * 2 * t * t
    else:
        return start + (end - start) * (1 - 2 * (1 - t) * (1 - t))

def cubic_ease_in(start, end, t):
    """Cubic EaseIn"""
    return start + (end - start) * t * t * t

def cubic_ease_out(start, end, t):
    """Cubic EaseOut"""
    return start + (end - start) * (1 - (1 - t) ** 3)

def cubic_ease_in_out(start, end, t):
    """Cubic EaseInOut"""
    if t < 0.5:
        return start + (end - start) * 4 * t * t * t
    else:
        return start + (end - start) * (1 - 4 * (1 - t) ** 3)

def quart_ease_in(start, end, t):
    """Quart EaseIn"""
    return start + (end - start) * t * t * t * t

def quart_ease_out(start, end, t):
    """Quart EaseOut"""
    return start + (end - start) * (1 - (1 - t) ** 4)

def quart_ease_in_out(start, end, t):
    """Quart EaseInOut"""
    if t < 0.5:
        return start + (end - start) * 8 * t * t * t * t
    else:
        return start + (end - start) * (1 - 8 * (1 - t) ** 4)

def quint_ease_in(start, end, t):
    """Quint EaseIn"""
    return start + (end - start) * t * t * t * t * t

def quint_ease_out(start, end, t):
    """Quint EaseOut"""
    return start + (end - start) * (1 - (1 - t) ** 5)

def quint_ease_in_out(start, end, t):
    """Quint EaseInOut"""
    if t < 0.5:
        return start + (end - start) * 16 * t * t * t * t * t
    else:
        return start + (end - start) * (1 - 16 * (1 - t) ** 5)

def expo_ease_in(start, end, t):
    """Expo EaseIn"""
    if t == 0:
        return start
    return start + (end - start) * (2 ** (10 * (t - 1)))

def expo_ease_out(start, end, t):
    """Expo EaseOut"""
    if t == 1:
        return end
    return start + (end - start) * (1 - 2 ** (-10 * t))

def expo_ease_in_out(start, end, t):
    """Expo EaseInOut"""
    if t == 0:
        return start
    if t == 1:
        return end
    if t < 0.5:
        return start + (end - start) * (2 ** (20 * t - 10)) / 2
    else:
        return start + (end - start) * (2 - 2 ** (-20 * t + 10)) / 2

def circ_ease_in(start, end, t):
    """Circ EaseIn"""
    return start + (end - start) * (1 - math.sqrt(1 - t * t))

def circ_ease_out(start, end, t):
    """Circ EaseOut"""
    return start + (end - start) * math.sqrt(1 - (t - 1) * (t - 1))

def circ_ease_in_out(start, end, t):
    """Circ EaseInOut"""
    if t < 0.5:
        return start + (end - start) * (1 - math.sqrt(1 - 4 * t * t)) / 2
    else:
        return start + (end - start) * (1 + math.sqrt(1 - 4 * (t - 1) * (t - 1))) / 2

def elastic_ease_in(start, end, t):
    """Elastic EaseIn"""
    if t == 0:
        return start
    if t == 1:
        return end
    c4 = (2 * math.pi) / 3
    return start + (end - start) * (-(2 ** (10 * (t - 1))) * math.sin((t - 1) * 10 - 0.75) * c4)

def elastic_ease_out(start, end, t):
    """Elastic EaseOut"""
    if t == 0:
        return start
    if t == 1:
        return end
    c4 = (2 * math.pi) / 3
    return start + (end - start) * ((2 ** (-10 * t)) * math.sin((t * 10 - 0.75) * c4) + 1)

def elastic_ease_in_out(start, end, t):
    """Elastic EaseInOut"""
    if t == 0:
        return start
    if t == 1:
        return end
    c5 = (2 * math.pi) / 4.5
    if t < 0.5:
        return start + (end - start) * (-(2 ** (20 * t - 10)) * math.sin((20 * t - 11.125) * c5)) / 2
    else:
        return start + (end - start) * ((2 ** (-20 * t + 10)) * math.sin((20 * t - 11.125) * c5) + 2) / 2

def back_ease_in(start, end, t):
    """Back EaseIn"""
    c1 = 1.70158
    c3 = c1 + 1
    return start + (end - start) * (c3 * t * t * t - c1 * t * t)

def back_ease_out(start, end, t):
    """Back EaseOut"""
    c1 = 1.70158
    c3 = c1 + 1
    return start + (end - start) * (1 + c3 * ((t - 1) ** 3) + c1 * ((t - 1) ** 2))

def back_ease_in_out(start, end, t):
    """Back EaseInOut"""
    c1 = 1.70158
    c2 = c1 * 1.525
    if t < 0.5:
        return start + (end - start) * ((2 * t) ** 2 * ((c2 + 1) * 2 * t - c2)) / 2
    else:
        return start + (end - start) * ((2 * t - 2) ** 2 * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2

def bounce_ease_in(start, end, t):
    """Bounce EaseIn"""
    return start + (end - start) * (1 - bounce_ease_out_raw(1 - t))

def bounce_ease_out(start, end, t):
    """Bounce EaseOut"""
    return start + (end - start) * bounce_ease_out_raw(t)

def bounce_ease_in_out(start, end, t):
    """Bounce EaseInOut"""
    if t < 0.5:
        return start + (end - start) * (1 - bounce_ease_out_raw(1 - 2 * t)) / 2
    else:
        return start + (end - start) * (1 + bounce_ease_out_raw(2 * t - 1)) / 2

def bounce_ease_out_raw(t):
    """Helper function for bounce easing"""
    n1 = 7.5625
    d1 = 2.75
    if t < 1 / d1:
        return n1 * t * t
    elif t < 2 / d1:
        return n1 * (t - 1.5 / d1) * (t - 1.5 / d1) + 0.75
    elif t < 2.5 / d1:
        return n1 * (t - 2.25 / d1) * (t - 2.25 / d1) + 0.9375
    else:
        return n1 * (t - 2.625 / d1) * (t - 2.625 / d1) + 0.984375

COCOS2DX_EASING_MAP = {
    # Linear
    0: linear,
    
    # Sine
    1: sine_ease_in,
    2: sine_ease_out, 
    3: sine_ease_in_out,
    
    # Quad
    4: quad_ease_in,
    5: quad_ease_out,
    6: quad_ease_in_out,
    
    # Cubic
    7: cubic_ease_in,
    8: cubic_ease_out,
    9: cubic_ease_in_out,
    
    # Quart
    10: quart_ease_in,
    11: quart_ease_out,
    12: quart_ease_in_out,
    
    # Quint
    13: quint_ease_in,
    14: quint_ease_out,
    15: quint_ease_in_out,
    
    # Expo
    16: expo_ease_in,
    17: expo_ease_out,
    18: expo_ease_in_out,
    
    # Circ
    19: circ_ease_in,
    20: circ_ease_out,
    21: circ_ease_in_out,
    
    # Elastic
    22: elastic_ease_in,
    23: elastic_ease_out,
    24: elastic_ease_in_out,
    
    # Back
    25: back_ease_in,
    26: back_ease_out,
    27: back_ease_in_out,
    
    # Bounce
    28: bounce_ease_in,
    29: bounce_ease_out,
    30: bounce_ease_in_out
}

def get_easing_function(type_id):
    """
    Get the easing function by Type ID
    
    Args:
        type_id (int): The Type value from <EasingData Type="X" />
        
    Returns:
        function: The easing function, or linear if not found
    """
    return COCOS2DX_EASING_MAP.get(type_id, linear)

def get_easing_name(type_id):
    """
    Get the easing function name by Type ID
    
    Args:
        type_id (int): The Type value from <EasingData Type="X" />
        
    Returns:
        str: The easing function name, or "Unknown" if not found
    """
    func = COCOS2DX_EASING_MAP.get(type_id)
    if func:
        return func.__name__.replace('_', ' ').title()
    return f"Unknown (Type={type_id})"

def apply_easing(start, end, progress, easing_type=0):
    """
    Apply easing function to interpolate between start and end values
    
    Args:
        start (float): Starting value
        end (float): Ending value
        progress (float): Progress from 0.0 to 1.0
        easing_type (int): Easing type ID (default: 0 for Linear)
        
    Returns:
        float: Interpolated value
    """
    # Clamp progress to [0, 1]
    progress = max(0.0, min(1.0, progress))
    
    easing_func = get_easing_function(easing_type)
    return easing_func(start, end, progress)

def print_easing_map():
    """Print the complete easing map for reference"""
    print("Cocos2dx Easing Functions Map:")
    print("=" * 40)
    for type_id, func in COCOS2DX_EASING_MAP.items():
        print(f"Type {type_id:2d}: {func.__name__.replace('_', ' ').title()}")

def test_easing_functions():
    """Test all easing functions with sample values"""
    print("\nTesting Easing Functions:")
    print("=" * 50)
    
    start_val = 0
    end_val = 100
    test_progress = [0.0, 0.25, 0.5, 0.75, 1.0]
    
    for type_id in range(0, 31):  # Test first 31 easing types
        if type_id in COCOS2DX_EASING_MAP:
            func = COCOS2DX_EASING_MAP[type_id]
            print(f"\nType {type_id} - {func.__name__.replace('_', ' ').title()}:")
            for t in test_progress:
                result = func(start_val, end_val, t)
                print(f"  t={t:.2f} -> {result:.2f}")

if __name__ == "__main__":
    print_easing_map()
    
    # Test a few easing functions
    print("\n" + "=" * 50)
    print("Sample Usage:")
    print("=" * 50)
    
    # Test linear easing
    result = apply_easing(0, 100, 0.5, 0)  # Linear
    print(f"Linear (Type 0): 0 -> 100 at 50% = {result}")
    
    # Test sine ease in
    result = apply_easing(0, 100, 0.5, 1)  # Sine EaseIn
    print(f"Sine EaseIn (Type 1): 0 -> 100 at 50% = {result:.2f}")
    
    # Test bounce ease out
    result = apply_easing(0, 100, 0.5, 29)  # Bounce EaseOut
    print(f"Bounce EaseOut (Type 29): 0 -> 100 at 50% = {result:.2f}")