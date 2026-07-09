<?php

namespace App\Enums;

enum TimeUnits: int
{
    case Minute = 1;
    case Hour = 2;
    case Day = 3;
    case Week = 4;
    case Month = 5;
}
