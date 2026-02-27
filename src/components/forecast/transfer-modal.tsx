import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StationData } from './area-types';
import { EmployeeForecast } from '@/lib/forecast/types';
import { Loader2 } from 'lucide-react';

interface TransferModalProps {
    isOpen: boolean;
    onClose: () => void;
    stations: StationData[];
    employees: EmployeeForecast[];
    onTransferSave: (data: { employee_id: string, from_station_id: string, to_station_id: string, start_week: number, end_week: number, hours: number }) => Promise<void>;
}

export function TransferModal({ isOpen, onClose, stations, employees, onTransferSave }: TransferModalProps) {
    const [isSaving, setIsSaving] = useState(false);

    // Form state
    const [fromStationId, setFromStationId] = useState<string>('');
    const [employeeId, setEmployeeId] = useState<string>('');
    const [toStationId, setToStationId] = useState<string>('');
    const [startWeek, setStartWeek] = useState<string>('');
    const [endWeek, setEndWeek] = useState<string>('');
    const [hours, setHours] = useState<string>('');

    // Filter employees based on selected "From Station"
    const availableEmployees = employees.filter(emp => emp.station_id === fromStationId);

    const handleSave = async () => {
        if (!employeeId || !fromStationId || !toStationId || !startWeek || !endWeek || !hours) return;

        setIsSaving(true);
        try {
            await onTransferSave({
                employee_id: employeeId,
                from_station_id: fromStationId,
                to_station_id: toStationId,
                start_week: parseInt(startWeek),
                end_week: parseInt(endWeek),
                hours: parseFloat(hours)
            });
            // Reset and close
            setFromStationId('');
            setEmployeeId('');
            setToStationId('');
            setStartWeek('');
            setEndWeek('');
            setHours('');
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    const isValid = employeeId && fromStationId && toStationId && startWeek && endWeek && hours && (parseInt(startWeek) <= parseInt(endWeek)) && fromStationId !== toStationId;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Låna ut resurs mellan stationer</DialogTitle>
                    <DialogDescription>
                        Flytta planerad arbetstid temporärt från en station till en annan under en specifik period.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Från Station (Källa)</Label>
                            <Select value={fromStationId} onValueChange={(val) => { setFromStationId(val); setEmployeeId(''); }}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Välj station..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {stations.map(s => (
                                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Medarbetare</Label>
                            <Select value={employeeId} onValueChange={setEmployeeId}>
                                <SelectTrigger disabled={!fromStationId}>
                                    <SelectValue placeholder="Välj person..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableEmployees.map(emp => (
                                        <SelectItem key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name} ({emp.category})</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Till Station (Mottagare)</Label>
                        <Select value={toStationId} onValueChange={setToStationId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Välj station..." />
                            </SelectTrigger>
                            <SelectContent>
                                {stations.filter(s => s.id !== fromStationId).map(s => (
                                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label>Startvecka</Label>
                            <Input type="number" min={1} max={52} value={startWeek} onChange={(e) => setStartWeek(e.target.value)} placeholder="v.X" />
                        </div>
                        <div className="space-y-2">
                            <Label>Slutvecka</Label>
                            <Input type="number" min={1} max={52} value={endWeek} onChange={(e) => setEndWeek(e.target.value)} placeholder="v.Y" />
                        </div>
                        <div className="space-y-2">
                            <Label>Timmar/vecka</Label>
                            <Input type="number" step="0.5" min={0.5} value={hours} onChange={(e) => setHours(e.target.value)} placeholder="T.ex 20" />
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isSaving}>Avbryt</Button>
                    <Button onClick={handleSave} disabled={!isValid || isSaving}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Spara resursflytt"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
