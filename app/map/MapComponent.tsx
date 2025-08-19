'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Button } from '@/components/ui/button'

delete (L.Icon.Default.prototype as unknown as { _getIconUrl: unknown })._getIconUrl
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

interface Vehicle {
    vehicleId: string
    lastLocationUpdateTime: number
    lastUpdateTime: number
    location?: { lat: number; lon: number }
    tripId?: string
    status: string
    phase: string
    occupancyCapacity?: number
    occupancyCount?: number
    occupancyStatus?: string
    agency?: Agency
    tripStatus?: TripStatus
    [key: string]: unknown
}

interface Agency {
    id: string
    name: string
    phone?: string
    url?: string
    timezone?: string
    fareUrl?: string
}

interface TripStatus {
    activeTripId?: string
    blockTripSequence?: number
    closestStop?: string
    closestStopTimeOffset?: number
    distanceAlongTrip?: number
    frequency?: unknown
    lastKnownDistanceAlongTrip?: number
    lastKnownLocation?: { lat: number; lon: number }
    lastKnownOrientation?: number
    lastLocationUpdateTime?: number
    lastUpdateTime?: number
    nextStop?: string
    nextStopTimeOffset?: number
    occupancyCapacity?: number
    occupancyCount?: number
    occupancyStatus?: string
    orientation?: number
    phase?: string
    position?: { lat: number; lon: number }
    predicted?: boolean
    scheduleDeviation?: number
    scheduledDistanceAlongTrip?: number
    serviceDate?: number
    situationIds?: string[]
    status?: string
    totalDistanceAlongTrip?: number
    vehicleId?: string
}

const AGENCY_COLORS: Record<string, string> = {
    '40': '#002E6D', // Sound Transit
    '1': '#EB6209', // King County Metro
    '3': '#036CB6', // Pierce Transit
    '29': '#3357A7', // Community Transit
    '23': '#F37320', // Kitsap Transit
    '19': '#A81E21', // Everett Transit
    '95': '#0C7960', // Washington State Ferries
    '51': '#002E6D', // Sound Transit Express
    '96': '#298240', // Link Light Rail
    '97': '#F18A20', // Tacoma Link
    '20': '#961A2F', // RapidRide
    '33': '#9BB6D4', // Sounder
}

const VEHICLE_SYMBOLS = {
    lightRail: 'L',
    ferry: 'F',
    monorail: 'M',
    train: 'T',
    bus: 'B',
    unknown: ''
} as const

const getAgencyColor = (agencyId: string): string => 
    AGENCY_COLORS[agencyId] || '#6B7280'

const getVehicleSymbol = (vehicle: Vehicle): string => {
    const agencyId = vehicle.agency?.id
    if (vehicle.vehicleId.includes('LLR')) return VEHICLE_SYMBOLS.lightRail
    if (agencyId === '95') return VEHICLE_SYMBOLS.ferry
    if (agencyId === '96') return VEHICLE_SYMBOLS.monorail
    if (agencyId === '51') return VEHICLE_SYMBOLS.train
    return VEHICLE_SYMBOLS.unknown
}

const createVehicleIcon = (vehicle: Vehicle): L.DivIcon => {
    const color = getAgencyColor(vehicle.agency?.id || 'unknown')
    const symbol = getVehicleSymbol(vehicle)

    return L.divIcon({
        html: `
            <div style="
                background-color: ${color};
                width: 18px;
                height: 18px;
                border-radius: 50%;
                border: 2px solid white;
                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                display: flex;
                align-items: center;
                justify-content: center;
            ">
                <div style="
                    color: white;
                    font-size: 10px;
                    font-weight: bold;
                    line-height: 1;
                ">${symbol}</div>
            </div>
        `,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
        popupAnchor: [0, -9],
        className: 'custom-vehicle-icon'
    })
}

interface MapComponentProps {
    vehicles: Vehicle[]
}

function MapBounds({ vehicles }: { vehicles: Vehicle[] }) {
    const map = useMap()

    useEffect(() => {
        if (vehicles.length === 0) return

        const validVehicles = vehicles.filter(v => v.location)
        if (validVehicles.length === 0) return

        const bounds = L.latLngBounds(
            validVehicles.map(vehicle => [
                vehicle.location!.lat,
                vehicle.location!.lon
            ])
        )
        map.fitBounds(bounds, { padding: [20, 20] })
    }, [vehicles, map])

    return null
}

const formatTime = (timestamp: number): string => {
    if (timestamp === 0) return 'Unknown'
    return new Date(timestamp).toLocaleTimeString()
}

const getVehicleType = (vehicleId: string, agencyId?: string): string => {
    if (vehicleId.includes('LLR')) return 'Light Rail'
    if (agencyId === '95') return 'Ferry'
    if (agencyId === '96') return 'Monorail'
    if (agencyId === '51') return 'Train'
    if (vehicleId.includes('KPOB')) return 'Bus'
    return 'Unknown Vehicle'
}

const formatScheduleDeviation = (deviation?: number): string => {
    if (deviation === undefined || deviation === 0) return 'On time'
    const minutes = Math.abs(deviation)
    const status = deviation > 0 ? 'late' : 'early'
    return `${minutes}s ${status}`
}

const formatDistance = (meters?: number): string => {
    if (meters === undefined || meters === 0) return 'N/A'
    if (meters < 1000) return `${Math.round(meters)}m`
    return `${(meters / 1000).toFixed(1)}km`
}

function VehiclePopup({ vehicle }: { vehicle: Vehicle }) {
    const [showDetails, setShowDetails] = useState(false)

    const statusColor = vehicle.status === 'SCHEDULED' ? 'bg-green-100 text-green-800' :
        vehicle.status === 'DELAYED' ? 'bg-yellow-100 text-yellow-800' :
        'bg-red-100 text-red-800'

    const deviationColor = vehicle.tripStatus?.scheduleDeviation === 0 ? 'text-green-600' :
        Math.abs(vehicle.tripStatus?.scheduleDeviation || 0) > 300 ? 'text-red-600' :
        'text-yellow-600'

    return (
        <div className="space-y-3 max-h-96 overflow-y-auto">
            <div className="flex justify-between items-start">
                <div>
                    <div className="font-bold text-lg">
                        {getVehicleType(vehicle.vehicleId, vehicle.agency?.id)}
                    </div>
                    <div className="text-sm text-gray-600">
                        {vehicle.agency?.name || 'Unknown Agency'}
                    </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded ${statusColor}`}>
                    {vehicle.status}
                </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                    <div className="font-medium text-gray-600">Vehicle ID</div>
                    <div className="font-mono text-xs">
                        {vehicle.vehicleId.split('_').pop()}
                    </div>
                </div>
                
                <div>
                    <div className="font-medium text-gray-600">Last Update</div>
                    <div>{formatTime(vehicle.lastLocationUpdateTime)}</div>
                </div>
                
                <div>
                    <div className="font-medium text-gray-600">Phase</div>
                    <div className="capitalize">{vehicle.phase.replace('_', ' ')}</div>
                </div>
                
                {vehicle.tripStatus?.scheduleDeviation !== undefined && (
                    <div>
                        <div className="font-medium text-gray-600">Schedule</div>
                        <div className={deviationColor}>
                            {formatScheduleDeviation(vehicle.tripStatus.scheduleDeviation)}
                        </div>
                    </div>
                )}
            </div>

            {vehicle.tripStatus && (
                <div className="border-t pt-2 space-y-1">
                    {vehicle.tripStatus.nextStop && (
                        <div className="text-sm">
                            <span className="font-medium">Next Stop: </span>
                            {vehicle.tripStatus.nextStop}
                        </div>
                    )}
                    
                    {vehicle.tripStatus.orientation !== undefined && (
                        <div className="text-sm">
                            <span className="font-medium">Heading: </span>
                            {Math.round(vehicle.tripStatus.orientation)}°
                        </div>
                    )}
                    
                    {vehicle.tripStatus.occupancyCount !== undefined && 
                     vehicle.tripStatus.occupancyCapacity !== undefined && 
                     vehicle.tripStatus.occupancyCapacity > 0 && (
                        <div className="text-sm">
                            <span className="font-medium">Occupancy: </span>
                            {vehicle.tripStatus.occupancyCount}/{vehicle.tripStatus.occupancyCapacity}
                            {' '}({Math.round((vehicle.tripStatus.occupancyCount / vehicle.tripStatus.occupancyCapacity) * 100)}%)
                        </div>
                    )}
                </div>
            )}

            {vehicle.agency && (
                <div className="border-t pt-2 text-sm">
                    <div className="font-medium text-gray-600 mb-1">Agency Details</div>
                    <div className="space-y-1">
                        <div className="text-xs text-gray-500">ID: {vehicle.agency.id}</div>
                        {vehicle.agency.phone && (
                            <div className="text-xs">📞 {vehicle.agency.phone}</div>
                        )}
                    </div>
                </div>
            )}

            <div className="border-t pt-2">
                <button
                    onClick={() => setShowDetails(!showDetails)}
                    className="flex items-center text-sm font-medium w-full"
                >
                    <span className="mr-1">{showDetails ? '▼' : '▶'}</span>
                    {showDetails ? 'Hide' : 'Show'} Detailed Data
                </button>
                
                {showDetails && (
                    <div className="mt-3 space-y-3 border-t pt-3">
                        {vehicle.tripStatus && (
                            <div className="text-sm">
                                <div className="font-medium text-gray-700 mb-2">Trip Status Details</div>
                                <div className="space-y-1 text-xs">
                                    {vehicle.tripStatus.activeTripId && (
                                        <div><span className="font-medium">Active Trip:</span> {vehicle.tripStatus.activeTripId}</div>
                                    )}
                                    {vehicle.tripStatus.distanceAlongTrip !== undefined && (
                                        <div><span className="font-medium">Distance Along Trip:</span> {formatDistance(vehicle.tripStatus.distanceAlongTrip)}</div>
                                    )}
                                    {vehicle.tripStatus.totalDistanceAlongTrip !== undefined && (
                                        <div><span className="font-medium">Total Trip Distance:</span> {formatDistance(vehicle.tripStatus.totalDistanceAlongTrip)}</div>
                                    )}
                                    {vehicle.tripStatus.closestStop && (
                                        <div><span className="font-medium">Closest Stop:</span> {vehicle.tripStatus.closestStop}</div>
                                    )}
                                    {vehicle.tripStatus.situationIds && vehicle.tripStatus.situationIds.length > 0 && (
                                        <div><span className="font-medium">Alerts:</span> {vehicle.tripStatus.situationIds.join(', ')}</div>
                                    )}
                                    {vehicle.location && (
                                        <div className="font-medium">
                                            <div>Lat: {vehicle.location.lat.toFixed(6)}</div>
                                            <div>Lon: {vehicle.location.lon.toFixed(6)}</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="text-sm">
                            <div className="font-medium text-gray-700 mb-2">Raw Vehicle Data</div>
                            <div className="p-2 bg-gray-50 rounded text-xs font-mono overflow-auto max-h-32">
                                <pre>{JSON.stringify(vehicle, null, 2)}</pre>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default function MapComponent({ vehicles }: MapComponentProps) {
    const defaultCenter: [number, number] = [47.6062, -122.3321]
    const [userLocation, setUserLocation] = useState<[number, number] | null>(null)

    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setUserLocation([position.coords.latitude, position.coords.longitude])
                },
                (error) => {
                    console.warn('Error getting user location:', error)
                }
            )
        }
    }, [])

    return (
        <MapContainer
            center={userLocation || defaultCenter}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
            className="rounded-lg"
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            <MapBounds vehicles={vehicles} />
            
            {vehicles.map((vehicle: Vehicle) => {
                if (!vehicle.location) return null
                
                return (
                    <Marker
                        key={vehicle.vehicleId}
                        position={[vehicle.location.lat, vehicle.location.lon]}
                        icon={createVehicleIcon(vehicle)}
                    >
                        <Popup maxWidth={400} maxHeight={500} className="vehicle-popup">
                            <VehiclePopup vehicle={vehicle} />
                        </Popup>
                    </Marker>
                )
            })}
        </MapContainer>
    )
}
