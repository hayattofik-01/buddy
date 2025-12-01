import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface CityAutocompleteProps {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}

interface City {
  display_name: string;
  lat: string;
  lon: string;
  place_id: number;
}

const CityAutocomplete = ({ id, label, placeholder, value, onChange, required = false }: CityAutocompleteProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<City[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchCities = async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          query
        )}&format=json&addressdetails=1&limit=5&featuretype=city`
      );
      const data = await response.json();
      setSuggestions(data);
      setIsOpen(true);
    } catch (error) {
      console.error("Error fetching cities:", error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (inputValue: string) => {
    onChange(inputValue);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      fetchCities(inputValue);
    }, 300);
  };

  const handleSelectCity = (city: City) => {
    const cityName = city.display_name.split(",")[0];
    onChange(cityName);
    setIsOpen(false);
    setSuggestions([]);
  };

  return (
    <div className="space-y-2 relative" ref={wrapperRef}>
      <Label htmlFor={id}>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          id={id}
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder={placeholder}
          className="pl-10"
          onFocus={() => value && fetchCities(value)}
          required={required}
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
        )}
      </div>

      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((city) => {
            const parts = city.display_name.split(",");
            const cityName = parts[0];
            const region = parts.slice(1).join(",");

            return (
              <button
                key={city.place_id}
                type="button"
                onClick={() => handleSelectCity(city)}
                className={cn(
                  "w-full px-4 py-3 text-left hover:bg-accent transition-colors",
                  "flex items-start gap-2 border-b border-border last:border-0"
                )}
              >
                <MapPin className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-foreground">{cityName}</div>
                  <div className="text-sm text-muted-foreground truncate">{region}</div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CityAutocomplete;
